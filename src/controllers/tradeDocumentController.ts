import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { createHash, randomBytes } from "crypto";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { SystemConfigModel } from "../database/models/systemConfig";
import { DocumentSequenceModel } from "../database/models/documentSequence";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateModel } from "../database/models/associate";
import { CommercialCustomerModel } from "../database/models/commercialDocument";
import { resolveTemplateForRender } from "../utils/documentTemplates";
import { IInquiry } from "../interfaces/enquiry";
import { DocumentRuleModel } from "../database/models/documentRule";
import { applyPaymentPlanDocUpdate } from "../utils/paymentPlan";
import { FlowRuleModel } from "../database/models/flowRule";
import { ensureDefaultFlowRules } from "../utils/flowRules";
import { getCalculationConfig } from "../utils/calculationConfig";
import { getOperatorPerspective, OperatorPerspective } from "../core/inquiry/inquiryAccessControl";
import path from "path";
import { DocumentExtractionJobModel } from "../database/models/documentExtractionJob";
import { processDocumentExtraction } from "../services/documentExtractionService";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isOperatorRole = (role: string) => role === "operator" || role === "team";
const isAssociateRole = (role: string) => role === "associate";
const round2 = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const formatMoney = (value: unknown, currency = "INR") => `${currency} ${new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))}`;
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

const activityTimeline = (events: any[] = []) => events.map((event: any) => ({
  action: String(event?.action || ""),
  createdAt: event?.createdAt || null,
})).filter((event: any) => event.action);

const exposeDocument = (row: any, includeActivity = true) => {
  const doc = row?.toObject ? row.toObject() : { ...row };
  delete doc.inviteTokenHash;
  const events = Array.isArray(doc.auditEvents) ? doc.auditEvents : [];
  delete doc.auditEvents;
  if (includeActivity) doc.activityTimeline = activityTimeline(events);
  const amountPaid = round2((doc.payments || []).reduce((sum: number, payment: any) => sum + Number(payment?.amount || 0), 0));
  const total = Number(doc?.totals?.grandTotal || 0);
  const balanceDue = Math.max(0, round2(total - amountPaid));
  const overdue = Boolean(doc.dueDate && new Date(doc.dueDate).getTime() < Date.now() && balanceDue > 0);
  doc.amountPaid = amountPaid;
  doc.balanceDue = balanceDue;
  doc.paymentStatus = balanceDue <= 0 && total > 0 ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : overdue ? "OVERDUE" : "UNPAID";
  doc.number = doc.documentNumber;
  const recipientParty = ["PURCHASE_ORDER", "GOODS_RECEIPT"].includes(String(doc.type || "")) ? doc.seller : doc.buyer;
  const issuerParty = ["PURCHASE_ORDER", "GOODS_RECEIPT"].includes(String(doc.type || "")) ? doc.buyer : doc.seller;
  doc.recipient = { ...(recipientParty || {}), billingAddress: recipientParty?.address || "" };
  doc.issuer = { ...(issuerParty || {}), billingAddress: issuerParty?.address || "" };
  doc.items = (doc.lineItems || []).map((item: any) => ({ ...item, description: item.description || item.productName || "", quantity: item.quantity || item.quantityMT || item.quantityKG || 0, unitPrice: item.unitPrice || item.ratePerKg || 0, subtotal: item.amount || 0 }));
  doc.currency = doc.totals?.currency || "INR";
  doc.subtotal = doc.totals?.subtotal || 0;
  doc.taxAmount = doc.totals?.taxAmount || 0;
  doc.discountAmount = doc.totals?.discountAmount || 0;
  doc.total = doc.totals?.grandTotal || 0;
  doc.notes = doc.terms?.notes || "";
  return doc;
};

const exposeSharedDocument = (row: any) => {
  const doc = exposeDocument(row, false);
  for (const key of ["ownerCompanyId", "customerId", "createdBy", "uploadedBy", "enquiryId", "orderId", "inventoryReservationId", "legacyCommercialDocumentId", "demoCreatedBy"]) delete doc[key];
  const publicParty = (party: any) => { const value = { ...(party || {}) }; delete value.associateId; delete value.companyId; return value; };
  doc.buyer = publicParty(doc.buyer); doc.seller = publicParty(doc.seller); doc.recipient = publicParty(doc.recipient); doc.issuer = publicParty(doc.issuer);
  return doc;
};

const STUDIO_TYPES = new Set([
  "LOI", "QUOTATION", "PROFORMA_INVOICE", "INVOICE", "PURCHASE_ORDER",
  "SALES_CONTRACT", "PACKING_LIST", "QUALITY_CERTIFICATE", "INSPECTION_CERTIFICATE",
  "PHYTOSANITARY_CERTIFICATE", "FUMIGATION_CERTIFICATE", "BILL_OF_LADING", "AIR_WAYBILL",
  "INSURANCE_CERTIFICATE", "PAYMENT_ADVICE", "LORRY_RECEIPT", "LCL_DRAFT", "SHIPPING_BILL",
  "CERTIFICATE_OF_ORIGIN", "DISPATCH_CHALLAN", "BILL_OF_ENTRY", "CUSTOMS_CLEARANCE", "GOODS_RECEIPT",
]);
const SELLER_RECIPIENT_TYPES = new Set(["PURCHASE_ORDER", "GOODS_RECEIPT"]);
const recipientPartyRole = (type: string) => SELLER_RECIPIENT_TYPES.has(type) ? "SELLER" : "BUYER";
const exposeCustomer = (row: any) => {
  const value = row?.toObject ? row.toObject() : { ...row };
  return { ...value, recipientRole: value.recipientRole || "BOTH", source: value.linkedCompanyId ? "REFERRED_COMPANY" : "EXTERNAL_CONTACT" };
};

const cleanText = (value: unknown, max = 500) => String(value || "").trim().slice(0, max);
const standaloneDocumentData = (type: string, value: any) => {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (type === "PACKING_LIST") {
    const packages = Array.isArray(input.packages) ? input.packages.slice(0, 100).map((row: any) => ({
      description: cleanText(row?.description, 250), packageType: cleanText(row?.packageType, 80),
      packageCount: Math.max(0, Number(row?.packageCount || 0)), grossWeight: Math.max(0, Number(row?.grossWeight || 0)),
      netWeight: Math.max(0, Number(row?.netWeight || 0)), dimensions: cleanText(row?.dimensions, 100), marks: cleanText(row?.marks, 200),
    })) : [];
    if (!packages.length || packages.some((row: any) => !row.description || !row.packageType || row.packageCount <= 0)) throw new Error("Add at least one valid package.");
    return { shipmentReference: cleanText(input.shipmentReference, 120), packages };
  }
  if (type === "QUALITY_CERTIFICATE") {
    const tests = Array.isArray(input.tests) ? input.tests.slice(0, 100).map((row: any) => ({
      parameter: cleanText(row?.parameter, 150), result: cleanText(row?.result, 150), unit: cleanText(row?.unit, 50),
      method: cleanText(row?.method, 150), limit: cleanText(row?.limit, 100),
    })) : [];
    const data = { commodity: cleanText(input.commodity, 200), sampleId: cleanText(input.sampleId, 100), batchLot: cleanText(input.batchLot, 100), conclusion: cleanText(input.conclusion, 1000), authorizedSignatory: cleanText(input.authorizedSignatory, 150), tests };
    if (!data.commodity || !data.sampleId || !data.batchLot || !data.tests.length || data.tests.some((row: any) => !row.parameter || !row.result)) throw new Error("Complete the sample, batch and test result details.");
    return data;
  }
  return { reference: cleanText(input.reference, 120) };
};

const approvedAssociateCompany = async (req: Request, res: Response) => {
  if (!isAssociateRole(normalizeRole(req.user?.role)) || !Types.ObjectId.isValid(String(req.user?.id || ""))) {
    res.status(403).json({ success: false, message: "A verified company account is required." });
    return null;
  }
  const associate: any = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
  const company: any = associate?.associateCompany
    ? await AssociateCompanyModel.findOne({ _id: associate.associateCompany, registrationStatus: "APPROVED", isDeleted: { $ne: true } }).select("name slug email phone address gstin logo").lean()
    : null;
  if (!company) res.status(403).json({ success: false, message: "Company verification is required." });
  return company;
};

const snapshotParty = (row: any, associateId?: any) => ({
  associateId: associateId && Types.ObjectId.isValid(String(associateId)) ? associateId : null,
  companyId: row?._id && Types.ObjectId.isValid(String(row._id)) ? row._id : row?.linkedCompanyId || null,
  name: String(row?.name || "").trim(), contactName: String(row?.contactName || "").trim(), email: String(row?.email || "").trim().toLowerCase(),
  phone: String(row?.phone || "").trim(), address: String(row?.address || row?.billingAddress || "").trim(), gstin: String(row?.gstin || "").trim(), logo: String(row?.logo || "").trim(),
});

const commercialItems = (body: any) => {
  if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 100) throw new Error("Add 1 to 100 product items.");
  return body.items.map((item: any) => {
    const description = String(item?.description || item?.productName || "").trim();
    const unit = String(item?.unit || "").trim();
    const quantity = Number(item?.quantity), unitPrice = Number(item?.unitPrice), taxRate = Number(item?.taxRate || 0);
    if (!description || !unit || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("Check item description, unit, quantity, price and tax rate.");
    const amount = round2(quantity * unitPrice), taxAmount = round2(amount * taxRate / 100);
    return { productId: toObjectId(item?.productId), productName: description, description, quantity, quantityMT: unit.toUpperCase() === "MT" ? quantity : 0, quantityKG: unit.toUpperCase() === "KG" ? quantity : 0, unit, unitPrice, ratePerKg: unit.toUpperCase() === "KG" ? unitPrice : 0, taxRate, amount, taxAmount, total: round2(amount + taxAmount) };
  });
};

const pdfEscape = (value: unknown) => String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const buildDocumentPdf = (doc: any) => {
  const rows = (doc.lineItems || []).slice(0, 18);
  const studio = doc.documentData || {};
  const letterhead = doc?.templateSnapshot?.letterheadConfig || {};
  const lines = [
    ...(letterhead?.enabled ? [`${letterhead?.name || doc.seller?.name || "OBAOL"}${letterhead?.watermark ? ` - ${letterhead.watermark}` : ""}`] : []),
    `${doc.seller?.name || "OBAOL"} - ${String(doc.type || "DOCUMENT").replace(/_/g, " ")}`,
    `Number: ${doc.documentNumber}`,
    `Issue date: ${new Date(doc.issueDate || doc.createdAt).toLocaleDateString("en-IN")}`,
    `Buyer: ${doc.buyer?.name || "-"}`,
    `Seller: ${doc.seller?.name || "-"}`,
    "",
    "Description | Quantity | Unit | Unit price | Tax | Total",
    ...rows.map((item: any) => `${item.description || item.productName || "-"} | ${item.quantity || item.quantityMT || 0} | ${item.unit || "-"} | ${item.unitPrice || item.ratePerKg || 0} | ${item.taxAmount || 0} | ${item.total || item.amount || 0}`),
    ...(doc.type === "PACKING_LIST" ? ["", `Shipment reference: ${studio.shipmentReference || "-"}`, "Description | Package | Count | Gross | Net | Dimensions | Marks", ...(studio.packages || []).slice(0, 18).map((item: any) => `${item.description || "-"} | ${item.packageType || "-"} | ${item.packageCount || 0} | ${item.grossWeight || 0} | ${item.netWeight || 0} | ${item.dimensions || "-"} | ${item.marks || "-"}`)] : []),
    ...(doc.type === "QUALITY_CERTIFICATE" ? ["", `Commodity: ${studio.commodity || "-"} | Sample: ${studio.sampleId || "-"} | Batch/lot: ${studio.batchLot || "-"}`, "Parameter | Result | Unit | Method | Limit", ...(studio.tests || []).slice(0, 18).map((item: any) => `${item.parameter || "-"} | ${item.result || "-"} | ${item.unit || "-"} | ${item.method || "-"} | ${item.limit || "-"}`), `Conclusion: ${studio.conclusion || "-"}`, `Authorized signatory: ${studio.authorizedSignatory || "-"}`] : []),
    "",
    `Subtotal: ${formatMoney(doc.totals?.subtotal, doc.totals?.currency || "INR")}`,
    `Tax: ${formatMoney(doc.totals?.taxAmount, doc.totals?.currency || "INR")}`,
    `Discount: ${formatMoney(doc.totals?.discountAmount, doc.totals?.currency || "INR")}`,
    `Total: ${formatMoney(doc.totals?.grandTotal, doc.totals?.currency || "INR")}`,
    `Payment terms: ${doc.terms?.paymentTerms || "-"}`,
    `Delivery terms: ${doc.terms?.deliveryTerms || "-"}`,
    `Terms and conditions: ${doc.terms?.termsAndConditions || "-"}`,
    `Notes: ${doc.terms?.notes || "-"}`,
  ];
  const stream = `BT\n/F1 11 Tf\n50 790 Td\n${lines.map((line, index) => `${index ? "0 -20 Td\n" : ""}(${pdfEscape(line)}) Tj`).join("\n")}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
};

const ownedCommercialDocument = async (req: Request, res: Response, includeInvite = false) => {
  const issuer = await approvedAssociateCompany(req, res);
  if (!issuer) return null;
  if (!Types.ObjectId.isValid(String(req.params.id || ""))) {
    res.status(400).json({ success: false, message: "Invalid document id." });
    return null;
  }
  const query = TradeDocumentModel.findOne({ _id: req.params.id, ownerCompanyId: issuer._id, isDeleted: { $ne: true } });
  if (includeInvite) query.select("+inviteTokenHash");
  const doc: any = await query;
  if (!doc) {
    res.status(404).json({ success: false, message: "Document not found." });
    return null;
  }
  return { issuer, doc };
};

const typeShort: Record<string, string> = {
  LOI: "LOI",
  QUOTATION: "QUO",
  PROFORMA_INVOICE: "PI",
  INVOICE: "INV",
  PURCHASE_ORDER: "PO",
  SALES_CONTRACT: "SC",
  PACKING_LIST: "PL",
  QUALITY_CERTIFICATE: "QC",
  INSPECTION_CERTIFICATE: "IC",
  PHYTOSANITARY_CERTIFICATE: "PHY",
  FUMIGATION_CERTIFICATE: "FUM",
  BILL_OF_LADING: "BOL",
  AIR_WAYBILL: "AWB",
  INSURANCE_CERTIFICATE: "INS",
  PAYMENT_ADVICE: "PAY",
  LORRY_RECEIPT: "LR",
  LCL_DRAFT: "LCL",
  SHIPPING_BILL: "SB",
  CERTIFICATE_OF_ORIGIN: "COO",
  DISPATCH_CHALLAN: "DC",
  BILL_OF_ENTRY: "BOE",
  CUSTOMS_CLEARANCE: "CC",
  GOODS_RECEIPT: "GR",
};

const resolveInquiryWorkflowStage = (enquiry: any) => {
  if (enquiry?.workflowStage) return String(enquiry.workflowStage).toUpperCase();
  if (enquiry?.order) return "ORDER_CONFIRMED";
  if (enquiry?.poSubmittedAt) return "PURCHASE_ORDER_CREATED";
  if (enquiry?.otherDocsCompletedAt) return "PURCHASE_ORDER_CREATED";
  if (enquiry?.proformaCreatedAt) return "OTHER_DOCUMENTS";
  if (enquiry?.responsibilitiesFinalizedAt) return "PROFORMA_ISSUED";
  if (enquiry?.buyerConfirmedAt) return "RESPONSIBILITIES_FINALIZED";
  if (enquiry?.quotationCreatedAt) return "QUOTATION_DECISION";
  if (enquiry?.revisionRequestedAt) return "QUOTATION_REVISION";
  if (enquiry?.supplierQtyConfirmedAt) return "QUOTATION_REVISION";
  if (enquiry?.loiSubmittedAt) return "LOI_ACCEPTED_QTY_CONFIRMED";
  return "ENQUIRY_CREATED";
};
const resolveOrderWorkflowStage = (order: any) => {
  if (order?.workflowStage) return String(order.workflowStage).toUpperCase();
  const legacy = String(order?.status || "").toLowerCase();
  if (legacy === "completed") return "TRADE_CLOSED";
  if (legacy === "arrived") return "DELIVERED";
  if (legacy === "in transit") return "SHIPPED";
  if (legacy === "loaded") return "READY_FOR_SHIPMENT";
  return "ORDER_CREATED";
};

const toObjectId = (value: any) => {
  if (!Types.ObjectId.isValid(String(value || ""))) return null;
  return new Types.ObjectId(String(value));
};

const buildCompanyCode = (company: any) => {
  const raw = String(company?.slug || company?.name || "COMP");
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(0, 6) || "COMP";
};

const computeTotals = (ratePerKg: number, commissionPerKg: number, quantityMT: number, taxAmount: number) => {
  const qtyKg = Number(quantityMT || 0) * 1000;
  const subtotal = Number(ratePerKg || 0) * qtyKg;
  const commissionTotal = Number(commissionPerKg || 0) * qtyKg;
  const taxes = Number(taxAmount || 0);
  const grandTotal = subtotal + commissionTotal + taxes;
  return { qtyKg, subtotal, commissionTotal, grandTotal };
};

const normalizeDocStatus = (value: unknown) => String(value || "").trim().toUpperCase();

const resolveInquiryStageForDocument = (enquiry: any, docType: string, docStatus: string) => {
  const status = normalizeDocStatus(docStatus);
  if (docType === "QUOTATION" && status !== "DRAFT") {
    return "QUOTATION_DECISION";
  }
  if (docType === "PROFORMA_INVOICE" && status !== "DRAFT") return "OTHER_DOCUMENTS";
  if (docType === "PURCHASE_ORDER") return "PURCHASE_ORDER_CREATED";
  return null;
};

const shouldAdvanceInquiryStage = (currentStage: string, nextStage: string, stageOrder: Map<string, number>) => {
  const currentOrder = stageOrder.get(String(currentStage || "").toUpperCase());
  const nextOrder = stageOrder.get(String(nextStage || "").toUpperCase());
  if (currentOrder === undefined || nextOrder === undefined) return true;
  return nextOrder >= currentOrder;
};

const normalizeAudienceScope = (scope: any) => {
  const normalized = String(scope || "SELLER_OBAOL").toUpperCase();
  if (normalized === "BUYER_OBAOL") return "OBAOL_BUYER";
  if (normalized === "OBAOL_BUYER") return "OBAOL_BUYER";
  return "SELLER_OBAOL";
};

const canPerspectiveSeeAudience = (perspective: OperatorPerspective, scope: any) => {
  if (perspective === "both") return true;
  const normalizedScope = normalizeAudienceScope(scope);
  if (perspective === "buyer") return normalizedScope === "OBAOL_BUYER";
  if (perspective === "supplier") return normalizedScope === "SELLER_OBAOL";
  return false;
};

const OBAOL_COMPANY_KEY = "OBAOL_COMPANY_ID";

const resolveObaolCompanyId = async (): Promise<Types.ObjectId | null> => {
  const envId = String(process.env.OBAOL_COMPANY_ID || "").trim();
  if (envId && Types.ObjectId.isValid(envId)) return new Types.ObjectId(envId);
  const config = await SystemConfigModel.findOne({ key: OBAOL_COMPANY_KEY }).lean();
  const configId = String(config?.value || "").trim();
  if (configId && Types.ObjectId.isValid(configId)) return new Types.ObjectId(configId);
  return null;
};

const buildSnapshotFromEnquiry = async (enquiry: IInquiry, inventoryReservationId?: Types.ObjectId | null) => {
  const populated = await InquiryModel.findById(enquiry._id)
    .populate([
      { path: "productId", select: "name" },
      {
        path: "variantRateId",
        select: "rate commission productVariant",
        populate: {
          path: "productVariant",
          select: "name product",
          populate: { path: "product", select: "name" },
        },
      },
      {
        path: "buyerAssociateId",
        select: "name email phone associateCompany",
        populate: { path: "associateCompany", select: "name email phone address gstin slug" },
      },
      {
        path: "sellerAssociateId",
        select: "name email phone associateCompany",
        populate: { path: "associateCompany", select: "name email phone address gstin slug" },
      },
      {
        path: "importListingId",
        select: "importerCompanyId importerAssociateId",
        populate: [
          { path: "importerCompanyId", select: "name email phone address gstin slug" },
          { path: "importerAssociateId", select: "name email phone associateCompany" },
        ],
      },
      { path: "preferredIncoterm", select: "code name" },
    ])
    .lean();

  if (!populated) throw new Error("Inquiry not found.");

  const buyerAssociate: any = populated.buyerAssociateId || {};
  let sellerAssociate: any = populated.sellerAssociateId || {};
  const buyerCompany: any = buyerAssociate.associateCompany || {};
  let sellerCompany: any = sellerAssociate.associateCompany || {};
  const importListing: any = (populated as any)?.importListingId || null;
  const importerCompany: any = importListing?.importerCompanyId || null;
  const importerAssociate: any = importListing?.importerAssociateId || null;

  if ((!sellerCompany || !sellerCompany?._id) && importerCompany) {
    sellerCompany = importerCompany;
  }
  if ((!sellerAssociate || !sellerAssociate?._id) && importerAssociate) {
    sellerAssociate = importerAssociate;
  }

  const ratePerKg = Number((populated as any).rate || (populated as any)?.variantRateId?.rate || 0);
  const commissionPerKg = Number(populated.adminCommission || 0) + Number(populated.mediatorCommission || 0);
  const quantityMT = Number(populated.quantity || 0);
  const baseTotals = computeTotals(ratePerKg, commissionPerKg, quantityMT, 0);
  const config = await getCalculationConfig();
  const gstPercent = Number(config.gstPercent || 0);
  const taxAmount = gstPercent > 0
    ? round2((baseTotals.subtotal + baseTotals.commissionTotal) * (gstPercent / 100))
    : 0;
  const subtotal = baseTotals.subtotal;
  const commissionTotal = baseTotals.commissionTotal;
  const qtyKg = baseTotals.qtyKg;
  const grandTotal = subtotal + commissionTotal + taxAmount;

  const productVariant = (populated as any)?.variantRateId?.productVariant;
  const productVariantId = productVariant?._id || null;
  const productVariantName = productVariant?.name || "";
  const productId = productVariant?.product?._id || (populated as any).productId?._id || null;
  const productName = productVariant?.product?.name || (populated as any).productId?.name || "";

  const incoterm = populated.preferredIncoterm as any;

  return {
    enquiry: populated,
    sellerCompany,
    buyer: {
      associateId: toObjectId(buyerAssociate?._id || populated.buyerAssociateId) || null,
      companyId: toObjectId(buyerCompany?._id || buyerAssociate?.associateCompany) || null,
      name: buyerCompany?.name || buyerAssociate?.name,
      email: buyerCompany?.email || buyerAssociate?.email,
      phone: buyerCompany?.phone || buyerAssociate?.phone,
      address: buyerCompany?.address || "",
      gstin: buyerCompany?.gstin || "",
    },
    seller: {
      associateId: toObjectId(sellerAssociate?._id || populated.sellerAssociateId) || null,
      companyId: toObjectId(sellerCompany?._id || sellerAssociate?.associateCompany) || null,
      name: sellerCompany?.name || sellerAssociate?.name,
      email: sellerCompany?.email || sellerAssociate?.email,
      phone: sellerCompany?.phone || sellerAssociate?.phone,
      address: sellerCompany?.address || "",
      gstin: sellerCompany?.gstin || "",
    },
    lineItems: [
      {
        productId: toObjectId(productId) || null,
        productName,
        productVariantId: toObjectId(productVariantId) || null,
        productVariantName,
        quantityMT,
        quantityKG: qtyKg,
        unit: "MT",
        ratePerKg,
        commissionPerKg,
        amount: subtotal,
      },
    ],
    totals: {
      currency: "INR",
      subtotal,
      commissionTotal,
      taxAmount,
      grandTotal,
    },
    terms: {
      incotermId: incoterm?._id || null,
      incotermCode: incoterm?.code || incoterm?.name || "",
      paymentTerms: "",
      deliveryTerms: "",
      notes: "",
    },
    inventoryReservationId: inventoryReservationId || null,
  };
};

const generateDocumentNumber = async (companyId: Types.ObjectId, docType: string, companyCode: string) => {
  const year = new Date().getFullYear();
  const seqDoc = await DocumentSequenceModel.findOneAndUpdate(
    { companyId, docType, year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seq = String(seqDoc.seq || 1).padStart(4, "0");
  const short = typeShort[docType] || docType;
  return `${companyCode}/${short}/${year}/${seq}`;
};

export class TradeDocumentController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const isPrivileged = isAdminRole(role) || isOperatorRole(role);

      const type = String(req.body?.type || "").toUpperCase();
      const allowedTypes = new Set([
        "LOI",
        "QUOTATION",
        "PROFORMA_INVOICE",
        "INVOICE",
        "PURCHASE_ORDER",
        "SALES_CONTRACT",
        "PACKING_LIST",
        "QUALITY_CERTIFICATE",
        "INSPECTION_CERTIFICATE",
        "PHYTOSANITARY_CERTIFICATE",
        "FUMIGATION_CERTIFICATE",
        "BILL_OF_LADING",
        "AIR_WAYBILL",
        "INSURANCE_CERTIFICATE",
        "PAYMENT_ADVICE",
        "LORRY_RECEIPT",
        "LCL_DRAFT"
        ,"SHIPPING_BILL", "CERTIFICATE_OF_ORIGIN", "DISPATCH_CHALLAN", "BILL_OF_ENTRY", "CUSTOMS_CLEARANCE", "GOODS_RECEIPT"
      ]);
      if (!allowedTypes.has(type)) {
        return res.status(400).json({ success: false, message: "Invalid document type." });
      }
      const enquiryId = toObjectId(req.body?.enquiryId);
      const orderId = toObjectId(req.body?.orderId);
      const inventoryReservationId = toObjectId(req.body?.inventoryReservationId);
      if (!type) return res.status(400).json({ success: false, message: "Document type is required." });

      let enquiry: any = null;
      let order: any = null;
      if (enquiryId) {
        enquiry = await InquiryModel.findById(enquiryId);
      } else if (orderId) {
        order = await OrderModel.findById(orderId).select("enquiry workflowStage status").lean();
        if (!order?.enquiry) {
          return res.status(404).json({ success: false, message: "Order not found or missing enquiry." });
        }
        enquiry = await InquiryModel.findById(order.enquiry);
      }
      if (!enquiryId && !orderId && STUDIO_TYPES.has(type)) {
        const issuer = await approvedAssociateCompany(req, res);
        if (!issuer) return;
        const customerId = toObjectId(req.body?.customerId);
        const customer: any = customerId ? await CommercialCustomerModel.findOne({ _id: customerId, ownerCompanyId: issuer._id }).lean() : null;
        if (!customer) return res.status(404).json({ success: false, message: "Customer not found." });
        let items: any[] = [];
        let documentData: Record<string, unknown> = {};
        try {
          if (!["PACKING_LIST", "QUALITY_CERTIFICATE"].includes(type)) items = commercialItems(req.body);
          documentData = standaloneDocumentData(type, req.body?.documentData);
        } catch (error: any) { return res.status(400).json({ success: false, message: error.message }); }
        const issueDate = new Date(req.body?.issueDate || Date.now());
        const validUntil = req.body?.validUntil ? new Date(req.body.validUntil) : null;
        const dueDate = req.body?.dueDate ? new Date(req.body.dueDate) : null;
        if (Number.isNaN(issueDate.getTime()) || (validUntil && (Number.isNaN(validUntil.getTime()) || validUntil < issueDate)) || (dueDate && (Number.isNaN(dueDate.getTime()) || dueDate < issueDate))) {
          return res.status(400).json({ success: false, message: "Check document dates." });
        }
        const currency = String(req.body?.currency || "INR").toUpperCase();
        if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ success: false, message: "Enter a three-letter currency code." });
        const subtotal = round2(items.reduce((sum, item) => sum + Number(item.amount || 0), 0));
        const taxAmount = round2(items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0));
        const discountAmount = round2(Number(req.body?.discountAmount || 0));
        if (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > subtotal + taxAmount) return res.status(400).json({ success: false, message: "Discount is invalid." });
        const template = await resolveTemplateForRender(type, String(issuer._id));
        const documentNumber = await generateDocumentNumber(issuer._id, type, buildCompanyCode(issuer));
        const created = await TradeDocumentModel.create({
          type, status: "DRAFT", documentNumber, ownerCompanyId: issuer._id, customerId: customer._id,
          buyer: recipientPartyRole(type) === "BUYER" ? snapshotParty({ ...customer, _id: customer.linkedCompanyId || null }) : snapshotParty(issuer, req.user?.id),
          seller: recipientPartyRole(type) === "SELLER" ? snapshotParty({ ...customer, _id: customer.linkedCompanyId || null }) : snapshotParty(issuer, req.user?.id),
          lineItems: items, totals: { currency, subtotal, commissionTotal: 0, taxAmount, discountAmount, grandTotal: round2(subtotal + taxAmount - discountAmount) },
          terms: { paymentTerms: String(req.body?.terms || req.body?.paymentTerms || ""), deliveryTerms: String(req.body?.deliveryTerms || ""), termsAndConditions: String(req.body?.termsAndConditions || ""), notes: String(req.body?.notes || "") },
          issueDate, validUntil, dueDate, documentData, createdBy: req.user?.id || null, audienceScope: "OBAOL_BUYER",
          templateSnapshot: template ? JSON.parse(JSON.stringify(template)) : null, sourceMode: "CREATED", extractionStatus: "NOT_REQUIRED",
          auditEvents: [{ action: "CREATED", actorId: req.user?.id || null, actorRole: role, metadata: { standalone: true } }],
        });
        return res.status(201).json({ success: true, data: exposeDocument(created) });
      }
      if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry is required to create document." });

      const stageType = enquiryId ? "INQUIRY" : "ORDER";
      const stageKey = stageType === "INQUIRY" ? resolveInquiryWorkflowStage(enquiry) : resolveOrderWorkflowStage(order);
      const stageRules = await DocumentRuleModel.find({
        docType: type,
        stageType,
        isActive: true,
        isDeleted: { $ne: true },
      }).lean();
      const rule = stageRules.find((r: any) => String(r.stageKey || "").toUpperCase() === stageKey) || stageRules[0] || null;

      if (!isPrivileged) {
        if (!rule) {
          return res.status(403).json({ success: false, message: "Only admin/operator can create documents." });
        }
        if (stageType === "INQUIRY") {
          await ensureDefaultFlowRules();
          const flowRules = await FlowRuleModel.find({
            flowType: "TRADE_ENQUIRY",
            isDeleted: { $ne: true },
            isActive: true,
          }).lean();
          const stageOrder = new Map<string, number>(
            flowRules.map((r: any) => [String(r.stageKey || "").toUpperCase(), Number(r.sortOrder || 0)])
          );
          const currentStage = String(stageKey || "").toUpperCase();
          const targetStage = String(rule.stageKey || "").toUpperCase();
          if (!shouldAdvanceInquiryStage(currentStage, targetStage, stageOrder)) {
            return res.status(403).json({ success: false, message: "Document cannot be created for the current inquiry stage." });
          }
        }
        const buyerId = String(enquiry?.buyerAssociateId || "");
        const sellerId = String(enquiry?.sellerAssociateId || "");
        const userId = String(req.user?.id || "");
        const roleKey = String(rule.responsibleRole || "");
        const isBuyer = roleKey === "BUYER" && buyerId === userId;
        const isSeller = roleKey === "SELLER" && sellerId === userId;
        if (!isBuyer && !isSeller) {
          return res.status(403).json({ success: false, message: "You are not allowed to create this document." });
        }
        if (String(rule.actionType || "") === "UPLOAD" && !req.body?.fileUrl) {
          return res.status(400).json({ success: false, message: "File URL is required for upload documents." });
        }
      }

      const snapshot = await buildSnapshotFromEnquiry(enquiry, inventoryReservationId || undefined);
      const sellerCompanyId = snapshot.seller?.companyId || null;
      if (!sellerCompanyId) return res.status(400).json({ success: false, message: "Seller company is missing." });

      const obaolCompanyId = await resolveObaolCompanyId();
      if (!obaolCompanyId) {
        return res.status(400).json({ success: false, message: "OBAOL company configuration is missing. Set it in Dashboard → Company." });
      }

      const [sellerCompany, obaolCompany] = await Promise.all([
        AssociateCompanyModel.findById(sellerCompanyId).select("name slug email phone address gstin").lean(),
        AssociateCompanyModel.findById(obaolCompanyId).select("name slug email phone address gstin").lean(),
      ]);
      if (!obaolCompany) {
        return res.status(400).json({ success: false, message: "OBAOL company configuration is invalid." });
      }

      const sellerCompanyCode = buildCompanyCode(sellerCompany);
      const obaolCompanyCode = buildCompanyCode(obaolCompany);
      const sellerDocNumber = await generateDocumentNumber(new Types.ObjectId(String(sellerCompanyId)), type, sellerCompanyCode);
      const obaolDocNumber = await generateDocumentNumber(obaolCompanyId, type, obaolCompanyCode);

      const obaolSnapshot = {
        associateId: null,
        companyId: obaolCompanyId,
        name: String(obaolCompany?.name || "").trim(),
        email: String(obaolCompany?.email || "").trim(),
        phone: String(obaolCompany?.phone || "").trim(),
        address: String(obaolCompany?.address || "").trim(),
        gstin: String(obaolCompany?.gstin || "").trim(),
      };

      const basePayload = {
        type,
        status: req.body?.status || "DRAFT",
        fileUrl: req.body?.fileUrl || null,
        uploadedBy: req.user?.id || null,
        verifiedStatus: req.body?.verifiedStatus || "PENDING",
        enquiryId: enquiry._id,
        orderId: orderId || null,
        inventoryReservationId: snapshot.inventoryReservationId || null,
        lineItems: snapshot.lineItems,
        totals: snapshot.totals,
        terms: { ...snapshot.terms, ...(req.body?.terms || {}) },
        createdBy: req.user?.id || null,
      };

      const createdSellerObaol = await TradeDocumentModel.create({
        ...basePayload,
        documentNumber: sellerDocNumber,
        buyer: obaolSnapshot,
        seller: snapshot.seller,
        audienceScope: "SELLER_OBAOL",
      });

      const createdObaolBuyer = await TradeDocumentModel.create({
        ...basePayload,
        documentNumber: obaolDocNumber,
        buyer: snapshot.buyer,
        seller: obaolSnapshot,
        audienceScope: "OBAOL_BUYER",
      });

      const created = createdSellerObaol;

      if (stageType === "INQUIRY") {
        let nextStage = resolveInquiryStageForDocument(enquiry, type, created?.status);
        if (String(type || "").toUpperCase() === "PROFORMA_INVOICE" && String(created?.status || "").toUpperCase() !== "DRAFT") {
          (enquiry as any).proformaCreatedAt = new Date();
        }
        if (String(type || "").toUpperCase() === "PURCHASE_ORDER" && String(created?.status || "").toUpperCase() !== "DRAFT") {
          (enquiry as any).poSubmittedAt = new Date();
          nextStage = "CONVERT_TO_ORDER";
        }
        if (nextStage) {
          await ensureDefaultFlowRules();
          const flowRules = await FlowRuleModel.find({
            flowType: "TRADE_ENQUIRY",
            isDeleted: { $ne: true },
            isActive: true,
          }).lean();
          const stageOrder = new Map<string, number>(
            flowRules.map((r: any) => [String(r.stageKey || "").toUpperCase(), Number(r.sortOrder || 0)])
          );
          const currentStage = String((enquiry as any)?.workflowStage || stageKey || "").toUpperCase();
          if (shouldAdvanceInquiryStage(currentStage, nextStage, stageOrder)) {
            (enquiry as any).workflowStage = nextStage;
            await enquiry.save();
          }
        }
      }

      if ((created as any).orderId) {
        await applyPaymentPlanDocUpdate(
          new Types.ObjectId(String((created as any).orderId)),
          String(created.type || ""),
          String((created as any).verifiedStatus || "")
        );
      }

      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async uploadAndExtract(req: Request, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ success: false, message: "Choose a PDF, PNG, or JPEG document." });
      const role = normalizeRole(req.user?.role);
      const type = String(req.body?.type || "").toUpperCase();
      if (!STUDIO_TYPES.has(type)) return res.status(400).json({ success: false, message: "Choose a supported document type." });

      let company: any = null;
      if (isAssociateRole(role)) company = await approvedAssociateCompany(req, res);
      else if ((isAdminRole(role) || isOperatorRole(role)) && Types.ObjectId.isValid(String(req.body?.companyId || ""))) {
        company = await AssociateCompanyModel.findById(req.body.companyId).select("name slug email phone address gstin logo").lean();
      }
      if (!company) return res.status(400).json({ success: false, message: "A valid owner company is required." });
      const customerId = toObjectId(req.body?.customerId);
      const customer: any = customerId ? await CommercialCustomerModel.findOne({ _id: customerId, ownerCompanyId: company._id }).lean() : null;
      const documentNumber = await generateDocumentNumber(company._id, type, buildCompanyCode(company));
      const created: any = await TradeDocumentModel.create({
        type, status: "DRAFT", documentNumber, ownerCompanyId: company._id, customerId: customer?._id || null,
        seller: snapshotParty(company, req.user?.id), buyer: customer ? snapshotParty({ ...customer, _id: customer.linkedCompanyId || null }) : {},
        enquiryId: toObjectId(req.body?.enquiryId), orderId: toObjectId(req.body?.orderId), inventoryReservationId: toObjectId(req.body?.inventoryReservationId),
        sourceMode: "UPLOADED", originalFileName: file.originalname, fileMimeType: file.mimetype, fileSize: file.size,
        fileUrl: "", uploadedBy: req.user?.id || null, extractionStatus: "QUEUED", verifiedStatus: "PENDING",
        createdBy: req.user?.id || null, audienceScope: "OBAOL_BUYER",
        auditEvents: [{ action: "FILE_UPLOADED", actorId: req.user?.id || null, actorRole: role, metadata: { name: file.originalname, mimeType: file.mimetype, size: file.size } }],
      });
      created.fileUrl = `/v1/web/trade-documents/${created._id}/file`;
      const job: any = await DocumentExtractionJobModel.create({ documentId: created._id, ownerCompanyId: company._id, requestedBy: req.user?.id, documentType: type, filePath: path.resolve(file.path), mimeType: file.mimetype });
      created.extractionJobId = job._id; await created.save();
      setImmediate(() => { processDocumentExtraction(String(job._id)).catch(() => undefined); });
      return res.status(202).json({ success: true, data: exposeDocument(created), extractionJob: { id: job._id, status: job.status } });
    } catch (error) { next(error); }
  }

  async extraction(req: Request, res: Response, next: NextFunction) {
    try {
      const job: any = await DocumentExtractionJobModel.findOne({ _id: req.params.jobId }).lean();
      if (!job) return res.status(404).json({ success: false, message: "Extraction job not found." });
      if (!isAdminRole(normalizeRole(req.user?.role)) && String(job.requestedBy) !== String(req.user?.id)) return res.status(403).json({ success: false, message: "Access denied." });
      return res.json({ success: true, data: job });
    } catch (error) { next(error); }
  }

  async confirmExtraction(req: Request, res: Response, next: NextFunction) {
    try {
      const job: any = await DocumentExtractionJobModel.findOne({ _id: req.params.jobId }).select("+rawText");
      if (!job) return res.status(404).json({ success: false, message: "Extraction job not found." });
      if (!isAdminRole(normalizeRole(req.user?.role)) && String(job.requestedBy) !== String(req.user?.id)) return res.status(403).json({ success: false, message: "Access denied." });
      if (!["REVIEW_REQUIRED", "FAILED"].includes(job.status)) return res.status(409).json({ success: false, message: "Extraction is not ready for review." });
      const patch: any = { extractionStatus: "COMPLETED", extractionReviewedAt: new Date(), extractionReviewedBy: req.user?.id, documentData: req.body?.documentData || {}, terms: req.body?.terms || {}, auditEvents: [] };
      if (req.body?.buyer) patch.buyer = req.body.buyer;
      if (req.body?.seller) patch.seller = req.body.seller;
      if (Array.isArray(req.body?.lineItems)) patch.lineItems = req.body.lineItems;
      if (req.body?.totals) patch.totals = req.body.totals;
      const doc: any = await TradeDocumentModel.findById(job.documentId);
      if (!doc) return res.status(404).json({ success: false, message: "Document not found." });
      Object.assign(doc, patch); doc.auditEvents.push({ action: "EXTRACTION_REVIEWED", actorId: req.user?.id || null, actorRole: normalizeRole(req.user?.role), metadata: { jobId: job._id } }); await doc.save();
      job.status = "COMPLETED"; await job.save();
      return res.json({ success: true, data: exposeDocument(doc) });
    } catch (error) { next(error); }
  }

  async retryExtraction(req: Request, res: Response, next: NextFunction) {
    try {
      const job: any = await DocumentExtractionJobModel.findById(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, message: "Extraction job not found." });
      if (!isAdminRole(normalizeRole(req.user?.role)) && String(job.requestedBy) !== String(req.user?.id)) return res.status(403).json({ success: false, message: "Access denied." });
      if (job.status !== "FAILED") return res.status(409).json({ success: false, message: "Only failed extraction jobs can be retried." });
      job.status = "QUEUED"; job.error = ""; job.startedAt = null; job.completedAt = null; await job.save();
      await TradeDocumentModel.findByIdAndUpdate(job.documentId, { extractionStatus: "QUEUED" });
      setImmediate(() => { processDocumentExtraction(String(job._id)).catch(() => undefined); });
      return res.status(202).json({ success: true, data: { id: job._id, status: job.status } });
    } catch (error) { next(error); }
  }

  async file(req: Request, res: Response, next: NextFunction) {
    try {
      const doc: any = await TradeDocumentModel.findById(req.params.id).lean();
      if (!doc || !doc.extractionJobId) return res.status(404).json({ success: false, message: "File not found." });
      const role = normalizeRole(req.user?.role);
      if (!isAdminRole(role) && String(doc.createdBy || doc.uploadedBy) !== String(req.user?.id)) {
        const associate: any = isAssociateRole(role) ? await AssociateModel.findById(req.user?.id).select("associateCompany").lean() : null;
        const sameCompany = associate?.associateCompany && [doc.ownerCompanyId, doc.buyer?.companyId, doc.seller?.companyId].some((value: any) => String(value || "") === String(associate.associateCompany));
        if (!sameCompany) return res.status(403).json({ success: false, message: "Access denied." });
      }
      const job: any = await DocumentExtractionJobModel.findById(doc.extractionJobId).select("+filePath");
      if (!job?.filePath) return res.status(404).json({ success: false, message: "File not found." });
      res.type(doc.fileMimeType || "application/octet-stream");
      return res.sendFile(path.resolve(job.filePath));
    } catch (error) { next(error); }
  }

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role), userId = String(req.user?.id || "");
      const query: any = { isDeleted: { $ne: true } };
      if (isAssociateRole(role)) {
        const associate: any = await AssociateModel.findById(userId).select("associateCompany").lean();
        if (!associate?.associateCompany) return res.json({ success: true, data: { total: 0, drafts: 0, pendingVerification: 0, shared: 0, extractionReview: 0 } });
        query.$or = [{ ownerCompanyId: associate.associateCompany }, { "buyer.companyId": associate.associateCompany }, { "seller.companyId": associate.associateCompany }];
      } else if (!isAdminRole(role) && !isOperatorRole(role)) return res.status(403).json({ success: false, message: "Access denied." });
      const [total, drafts, pendingVerification, shared, extractionReview] = await Promise.all([
        TradeDocumentModel.countDocuments(query), TradeDocumentModel.countDocuments({ ...query, status: "DRAFT" }),
        TradeDocumentModel.countDocuments({ ...query, verifiedStatus: "PENDING", sourceMode: "UPLOADED" }),
        TradeDocumentModel.countDocuments({ ...query, status: { $in: ["SENT", "ACCEPTED", "REJECTED"] } }),
        TradeDocumentModel.countDocuments({ ...query, extractionStatus: { $in: ["REVIEW_REQUIRED", "FAILED"] } }),
      ]);
      return res.json({ success: true, data: { total, drafts, pendingVerification, shared, extractionReview } });
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const page = Math.max(parseInt(String(req.query?.page || "1"), 10), 1);
      const limit = Math.min(Math.max(parseInt(String(req.query?.limit || "20"), 10), 1), 200);
      const status = String(req.query?.status || "").toUpperCase();
      const type = String(req.query?.type || "").toUpperCase();
      const enquiryId = toObjectId(req.query?.enquiryId);
      const orderId = toObjectId(req.query?.orderId);
      const companyId = toObjectId(req.query?.companyId);
      const customerId = toObjectId(req.query?.customerId);
      const from = req.query?.from ? new Date(String(req.query.from)) : null;
      const to = req.query?.to ? new Date(String(req.query.to)) : null;

      const query: any = { isDeleted: { $ne: true } };
      if (status) query.status = status;
      if (type) query.type = type;
      if (enquiryId) query.enquiryId = enquiryId;
      if (orderId) query.orderId = orderId;
      if (companyId) query["seller.companyId"] = companyId;
      if (customerId) query.customerId = customerId;
      if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
        query.issueDate = {};
        if (from && !Number.isNaN(from.getTime())) query.issueDate.$gte = from;
        if (to && !Number.isNaN(to.getTime())) { to.setHours(23, 59, 59, 999); query.issueDate.$lte = to; }
      }

      if (isAdminRole(role)) {
        // full access
      } else if (isOperatorRole(role)) {
        const assignedInquiries = await InquiryModel.find({
          $or: [
            { dealCloserOperatorId: new Types.ObjectId(userId) },
            { supplierOperatorId: new Types.ObjectId(userId) },
            { handlerOperatorId: new Types.ObjectId(userId) },
          ],
          isDeleted: { $ne: true },
        })
          .select("_id dealCloserOperatorId supplierOperatorId handlerOperatorId")
          .lean();
        const perspectiveByInquiryId = new Map<string, OperatorPerspective>();
        for (const inquiry of assignedInquiries) {
          const inquiryId = String((inquiry as any)?._id || "");
          if (!inquiryId) continue;
          perspectiveByInquiryId.set(inquiryId, getOperatorPerspective(inquiry as any, userId));
        }
        if (perspectiveByInquiryId.size === 0) {
          return res.status(200).json({
            success: true,
            data: { data: [], total: 0, page, limit },
          });
        }
        query.enquiryId = { $in: Array.from(perspectiveByInquiryId.keys()).map((id) => new Types.ObjectId(id)) };
      } else if (isAssociateRole(role)) {
        const associate: any = await AssociateModel.findById(userId).select("associateCompany").lean();
        const associateCompanyId = associate?.associateCompany && Types.ObjectId.isValid(String(associate.associateCompany)) ? new Types.ObjectId(String(associate.associateCompany)) : null;
        query.$or = [
          { "buyer.associateId": new Types.ObjectId(userId) },
          { "seller.associateId": new Types.ObjectId(userId) },
          ...(associateCompanyId ? [{ ownerCompanyId: associateCompanyId }, { "buyer.companyId": associateCompanyId }, { "seller.companyId": associateCompanyId }] : []),
        ];
      } else {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const [rows, total] = await Promise.all([
        TradeDocumentModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        TradeDocumentModel.countDocuments(query),
      ]);

      let filteredRows = rows;
      if (isOperatorRole(role)) {
        const inquiryIds = Array.from(
          new Set((rows || []).map((row: any) => String((row as any)?.enquiryId || "")).filter(Boolean))
        );
        const inquiries = await InquiryModel.find({
          _id: { $in: inquiryIds.map((id) => new Types.ObjectId(id)) },
        })
          .select("_id dealCloserOperatorId supplierOperatorId handlerOperatorId")
          .lean();
        const perspectiveByInquiryId = new Map<string, OperatorPerspective>();
        for (const inquiry of inquiries) {
          const inquiryId = String((inquiry as any)?._id || "");
          if (!inquiryId) continue;
          perspectiveByInquiryId.set(inquiryId, getOperatorPerspective(inquiry as any, userId));
        }
        filteredRows = (rows || []).filter((row: any) => {
          const inquiryId = String((row as any)?.enquiryId || "");
          if (!inquiryId) return false;
          const perspective = perspectiveByInquiryId.get(inquiryId) || "none";
          return canPerspectiveSeeAudience(perspective, (row as any)?.audienceScope);
        });
      } else if (isAssociateRole(role)) {
        const docTypes = Array.from(new Set((rows || []).map((row: any) => String(row.type || ""))));
        const rules = await DocumentRuleModel.find({
          docType: { $in: docTypes },
          isDeleted: { $ne: true },
          isActive: true,
        }).lean();
        const ruleMap = new Map<string, any>();
        for (const rule of rules) {
          ruleMap.set(String(rule.docType), rule);
        }
        filteredRows = (rows || []).filter((row: any) => {
          const rule = ruleMap.get(String(row.type || ""));
          if (!rule) return true;
          const visibility = String(rule.visibility || "BOTH");
          if (visibility === "INTERNAL") return false;
          if (visibility === "BOTH") return true;
          const buyerId = String((row as any)?.buyer?.associateId || "");
          const sellerId = String((row as any)?.seller?.associateId || "");
          if (visibility === "BUYER") return buyerId === userId;
          if (visibility === "SELLER") return sellerId === userId;
          return true;
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          data: filteredRows.map((row: any) => exposeDocument(row)),
          total: filteredRows.length,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid document id." });
      }

      const doc = await TradeDocumentModel.findById(id).lean();
      if (!doc || (doc as any).isDeleted) return res.status(404).json({ success: false, message: "Document not found." });

      if (isAdminRole(role)) {
        // ok
      } else if (isOperatorRole(role)) {
        const enquiryId = String((doc as any)?.enquiryId || "");
        if (!enquiryId || !Types.ObjectId.isValid(enquiryId)) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
        const inquiry = await InquiryModel.findById(enquiryId)
          .select("_id dealCloserOperatorId supplierOperatorId handlerOperatorId")
          .lean();
        if (!inquiry) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
        const perspective = getOperatorPerspective(inquiry as any, userId);
        if (perspective === "none" || !canPerspectiveSeeAudience(perspective, (doc as any)?.audienceScope)) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
      } else if (isAssociateRole(role)) {
        const buyerId = String((doc as any)?.buyer?.associateId || "");
        const sellerId = String((doc as any)?.seller?.associateId || "");
        const associate: any = await AssociateModel.findById(userId).select("associateCompany").lean();
        const companyId = String(associate?.associateCompany || "");
        const companyMatch = companyId && [String((doc as any)?.ownerCompanyId || ""), String((doc as any)?.buyer?.companyId || ""), String((doc as any)?.seller?.companyId || "")].includes(companyId);
        if (buyerId !== userId && sellerId !== userId && !companyMatch) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
        const rule = await DocumentRuleModel.findOne({
          docType: String((doc as any)?.type || ""),
          isDeleted: { $ne: true },
          isActive: true,
        }).lean();
        if (rule) {
          const visibility = String(rule.visibility || "BOTH");
          if (visibility === "INTERNAL") {
            return res.status(403).json({ success: false, message: "Access denied." });
          }
          if (visibility === "BUYER" && buyerId !== userId) {
            return res.status(403).json({ success: false, message: "Access denied." });
          }
          if (visibility === "SELLER" && sellerId !== userId) {
            return res.status(403).json({ success: false, message: "Access denied." });
          }
        }
      } else {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      return res.status(200).json({ success: true, data: exposeDocument(doc) });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const isPrivileged = isAdminRole(role) || isOperatorRole(role);

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid document id." });
      }

      const existing = await TradeDocumentModel.findById(id).lean();
      if (!existing || (existing as any).isDeleted) return res.status(404).json({ success: false, message: "Document not found." });

      const standaloneOwner = isAssociateRole(role) && String((existing as any)?.ownerCompanyId || "") && String((existing as any)?.status || "") === "DRAFT"
        ? await approvedAssociateCompany(req, res)
        : null;
      const canEditStandalone = Boolean(standaloneOwner && String(standaloneOwner._id) === String((existing as any).ownerCompanyId));
      if (!isPrivileged && !canEditStandalone) {
        const enquiry = (existing as any)?.enquiryId ? await InquiryModel.findById((existing as any).enquiryId) : null;
        const buyerId = String(enquiry?.buyerAssociateId || "");
        const sellerId = String(enquiry?.sellerAssociateId || "");
        const userId = String(req.user?.id || "");
        const rule = await DocumentRuleModel.findOne({
          docType: String((existing as any).type || ""),
          isActive: true,
          isDeleted: { $ne: true },
        }).lean();
        if (!rule) return res.status(403).json({ success: false, message: "Only admin/operator can update documents." });
        const roleKey = String(rule.responsibleRole || "");
        const isBuyer = roleKey === "BUYER" && buyerId === userId;
        const isSeller = roleKey === "SELLER" && sellerId === userId;
        if (!isBuyer && !isSeller) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
        if (String(rule.actionType || "") !== "UPLOAD") {
          return res.status(403).json({ success: false, message: "Only upload documents can be updated by associates." });
        }
      }

      const nextTerms = { ...(existing as any).terms, ...(req.body?.terms || {}) };
      const nextTotals = { ...(existing as any).totals, ...(req.body?.totals || {}) };
      const taxAmount = Number(nextTotals.taxAmount || 0);
      const subtotal = Number(nextTotals.subtotal || 0);
      const commissionTotal = Number(nextTotals.commissionTotal || 0);
      nextTotals.grandTotal = subtotal + commissionTotal + taxAmount;
      if (canEditStandalone) {
        const issueDate = new Date(req.body?.issueDate || (existing as any).issueDate);
        const validUntil = req.body?.validUntil ? new Date(req.body.validUntil) : null;
        const dueDate = req.body?.dueDate ? new Date(req.body.dueDate) : null;
        const currency = String(req.body?.currency || (existing as any)?.totals?.currency || "INR").toUpperCase();
        if (Number.isNaN(issueDate.getTime()) || (validUntil && (Number.isNaN(validUntil.getTime()) || validUntil < issueDate)) || (dueDate && (Number.isNaN(dueDate.getTime()) || dueDate < issueDate))) return res.status(400).json({ success: false, message: "Check document dates." });
        if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ success: false, message: "Enter a three-letter currency code." });
      }

      const updatePayload: any = isPrivileged
        ? {
          status: req.body?.status || (existing as any).status,
          terms: nextTerms,
          totals: nextTotals,
        }
        : canEditStandalone ? (() => {
          const docType = String((existing as any).type || "");
          const items = ["PACKING_LIST", "QUALITY_CERTIFICATE"].includes(docType) ? [] : commercialItems(req.body);
          const documentData = standaloneDocumentData(docType, req.body?.documentData);
          const subtotal = round2(items.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0));
          const taxAmount = round2(items.reduce((sum: number, item: any) => sum + Number(item.taxAmount || 0), 0));
          const discountAmount = round2(Number(req.body?.discountAmount || 0));
          return { lineItems: items, documentData, totals: { currency: String(req.body?.currency || (existing as any)?.totals?.currency || "INR").toUpperCase(), subtotal, commissionTotal: 0, taxAmount, discountAmount, grandTotal: round2(subtotal + taxAmount - discountAmount) }, terms: { paymentTerms: String(req.body?.terms || ""), deliveryTerms: String(req.body?.deliveryTerms || ""), termsAndConditions: String(req.body?.termsAndConditions || ""), notes: String(req.body?.notes || "") }, issueDate: req.body?.issueDate || (existing as any).issueDate, validUntil: req.body?.validUntil || null, dueDate: req.body?.dueDate || null, auditEvents: [...((existing as any).auditEvents || []), { action: "DRAFT_UPDATED", actorId: req.user?.id || null, actorRole: role }] };
        })() : {};
      if (req.body?.fileUrl !== undefined) {
        updatePayload.fileUrl = req.body.fileUrl || null;
        updatePayload.uploadedBy = req.user?.id || null;
      }
      if (isPrivileged && req.body?.verifiedStatus) {
        updatePayload.verifiedStatus = req.body.verifiedStatus;
        updatePayload.auditEvents = [...((existing as any).auditEvents || []), { action: req.body.verifiedStatus === "VERIFIED" ? "UPLOAD_VERIFIED" : "UPLOAD_REJECTED", actorId: req.user?.id || null, actorRole: role }];
      }
      if (req.body?.orderId && Types.ObjectId.isValid(String(req.body.orderId))) {
        updatePayload.orderId = new Types.ObjectId(String(req.body.orderId));
      }
      if (canEditStandalone && req.body?.customerId) {
        const customerId = toObjectId(req.body.customerId);
        const customer: any = customerId ? await CommercialCustomerModel.findOne({ _id: customerId, ownerCompanyId: standaloneOwner!._id }).lean() : null;
        if (!customer) return res.status(404).json({ success: false, message: "Customer not found." });
        updatePayload.customerId = customer._id;
        const recipient = snapshotParty({ ...customer, _id: customer.linkedCompanyId || null });
        const issuer = snapshotParty(standaloneOwner, req.user?.id);
        updatePayload.buyer = recipientPartyRole(String((existing as any).type || "")) === "BUYER" ? recipient : issuer;
        updatePayload.seller = recipientPartyRole(String((existing as any).type || "")) === "SELLER" ? recipient : issuer;
      }

      const updated = await TradeDocumentModel.findByIdAndUpdate(id, updatePayload, { new: true });
      if ((updated as any)?.orderId) {
        await applyPaymentPlanDocUpdate(
          new Types.ObjectId(String((updated as any).orderId)),
          String((updated as any).type || ""),
          String((updated as any).verifiedStatus || "")
        );
      }
      if ((updated as any)?.enquiryId) {
        const enquiry = await InquiryModel.findById((updated as any).enquiryId);
        if (enquiry) {
          const nextStage = resolveInquiryStageForDocument(
            enquiry,
            String((updated as any)?.type || ""),
            String((updated as any)?.status || "")
          );
          if (nextStage) {
            await ensureDefaultFlowRules();
            const flowRules = await FlowRuleModel.find({
              flowType: "TRADE_ENQUIRY",
              isDeleted: { $ne: true },
              isActive: true,
            }).lean();
            const stageOrder = new Map<string, number>(
              flowRules.map((r: any) => [String(r.stageKey || "").toUpperCase(), Number(r.sortOrder || 0)])
            );
            const currentStage = String((enquiry as any)?.workflowStage || "").toUpperCase();
            if (shouldAdvanceInquiryStage(currentStage, nextStage, stageOrder)) {
              (enquiry as any).workflowStage = nextStage;
              await enquiry.save();
            }
          }
        }
      }
      return res.status(200).json({ success: true, data: exposeDocument(updated) });
    } catch (error) {
      next(error);
    }
  }

  async listCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const issuer = await approvedAssociateCompany(req, res); if (!issuer) return;
      const rows = await CommercialCustomerModel.find({ ownerCompanyId: issuer._id }).sort({ updatedAt: -1 }).limit(500).lean();
      return res.json({ success: true, data: rows.map(exposeCustomer) });
    } catch (error) { next(error); }
  }

  async listRecipientDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const issuer = await approvedAssociateCompany(req, res); if (!issuer) return;
      const rows = await AssociateCompanyModel.find({
        referredByCompanyId: issuer._id,
        registrationStatus: "APPROVED",
        isDeleted: { $ne: true },
      }).sort({ name: 1 }).select("name email phone address gstin logo").limit(500).lean();
      return res.json({ success: true, data: rows.map((row: any) => ({
        id: row._id, name: row.name || "", email: row.email || "", phone: row.phone || "",
        billingAddress: row.address || "", gstin: row.gstin || "", logo: row.logo || "",
      })) });
    } catch (error) { next(error); }
  }

  async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const issuer = await approvedAssociateCompany(req, res); if (!issuer) return;
      const recipientRole = String(req.body?.recipientRole || "BOTH").toUpperCase();
      const input = { name: String(req.body?.name || "").trim(), contactName: String(req.body?.contactName || "").trim(), email: String(req.body?.email || "").trim().toLowerCase(), billingAddress: String(req.body?.billingAddress || "").trim(), phone: String(req.body?.phone || "").trim(), gstin: String(req.body?.gstin || "").trim(), linkedCompanyId: toObjectId(req.body?.linkedCompanyId), recipientRole };
      if (!input.name || !input.contactName || !/^\S+@\S+\.\S+$/.test(input.email) || !input.billingAddress) return res.status(400).json({ success: false, message: "Customer name, contact, email and billing address are required." });
      if (!["BUYER", "SELLER", "BOTH"].includes(recipientRole)) return res.status(400).json({ success: false, message: "Choose Buyer, Seller, or Both." });
      if (input.linkedCompanyId && !await AssociateCompanyModel.exists({ _id: input.linkedCompanyId, referredByCompanyId: issuer._id, registrationStatus: "APPROVED", isDeleted: { $ne: true } })) return res.status(400).json({ success: false, message: "Only a directly referred company can be linked." });
      const created = await CommercialCustomerModel.create({ ...input, ownerCompanyId: issuer._id });
      return res.status(201).json({ success: true, data: exposeCustomer(created) });
    } catch (error) { next(error); }
  }

  async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const issuer = await approvedAssociateCompany(req, res); if (!issuer) return;
      if (!Types.ObjectId.isValid(String(req.params.id || ""))) return res.status(400).json({ success: false, message: "Invalid customer id." });
      const recipientRole = String(req.body?.recipientRole || "BOTH").toUpperCase();
      const input = { name: String(req.body?.name || "").trim(), contactName: String(req.body?.contactName || "").trim(), email: String(req.body?.email || "").trim().toLowerCase(), billingAddress: String(req.body?.billingAddress || "").trim(), phone: String(req.body?.phone || "").trim(), gstin: String(req.body?.gstin || "").trim(), linkedCompanyId: toObjectId(req.body?.linkedCompanyId), recipientRole };
      if (!input.name || !input.contactName || !/^\S+@\S+\.\S+$/.test(input.email) || !input.billingAddress) return res.status(400).json({ success: false, message: "Customer name, contact, email and billing address are required." });
      if (!["BUYER", "SELLER", "BOTH"].includes(recipientRole)) return res.status(400).json({ success: false, message: "Choose Buyer, Seller, or Both." });
      if (input.linkedCompanyId && !await AssociateCompanyModel.exists({ _id: input.linkedCompanyId, referredByCompanyId: issuer._id, registrationStatus: "APPROVED", isDeleted: { $ne: true } })) return res.status(400).json({ success: false, message: "Only a directly referred company can be linked." });
      const updated = await CommercialCustomerModel.findOneAndUpdate({ _id: req.params.id, ownerCompanyId: issuer._id }, input, { new: true, runValidators: true });
      return updated ? res.json({ success: true, data: exposeCustomer(updated) }) : res.status(404).json({ success: false, message: "Customer not found." });
    } catch (error) { next(error); }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ownedCommercialDocument(req, res); if (!result) return;
      if (result.doc.status !== "DRAFT") return res.status(409).json({ success: false, message: "Only a draft can be issued." });
      if (!result.doc.templateSnapshot) result.doc.templateSnapshot = await resolveTemplateForRender(result.doc.type, String(result.issuer._id));
      result.doc.status = "SENT"; result.doc.issuedAt = new Date();
      result.doc.auditEvents.push({ action: "ISSUED", actorId: req.user?.id || null, actorRole: normalizeRole(req.user?.role) });
      await result.doc.save();
      return res.json({ success: true, data: exposeDocument(result.doc) });
    } catch (error) { next(error); }
  }

  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ownedCommercialDocument(req, res, true); if (!result) return;
      if (result.doc.status === "DRAFT") return res.status(409).json({ success: false, message: "Issue the document before creating an invitation." });
      const token = randomBytes(32).toString("hex");
      result.doc.inviteTokenHash = tokenHash(token); result.doc.inviteExpiresAt = new Date(Date.now() + 30 * 86400000); result.doc.inviteRevokedAt = null;
      result.doc.auditEvents.push({ action: "INVITE_LINK_CREATED", actorId: req.user?.id || null, actorRole: normalizeRole(req.user?.role) });
      await result.doc.save();
      const base = String(process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
      return res.json({ success: true, data: exposeDocument(result.doc), inviteUrl: `${base}/documents/share/${token}` });
    } catch (error) { next(error); }
  }

  async revokeInvite(req: Request, res: Response, next: NextFunction) {
    try { const result = await ownedCommercialDocument(req, res); if (!result) return; result.doc.inviteRevokedAt = new Date(); result.doc.auditEvents.push({ action: "INVITE_REVOKED", actorId: req.user?.id || null, actorRole: normalizeRole(req.user?.role) }); await result.doc.save(); return res.json({ success: true, data: exposeDocument(result.doc) }); } catch (error) { next(error); }
  }

  async getShared(req: Request, res: Response, next: NextFunction) {
    try {
      const token = String(req.params.token || "");
      if (!/^[a-f0-9]{64}$/.test(token)) return res.status(404).json({ success: false, message: "Invitation not found." });
      const doc: any = await TradeDocumentModel.findOne({ inviteTokenHash: tokenHash(token), isDeleted: { $ne: true } }).select("+inviteTokenHash");
      if (!doc || !doc.inviteExpiresAt || doc.inviteExpiresAt.getTime() < Date.now() || doc.inviteRevokedAt || doc.status === "DRAFT") return res.status(404).json({ success: false, message: "Invitation expired or unavailable." });
      const now = new Date();
      doc.firstViewedAt = doc.firstViewedAt || now; doc.lastViewedAt = now; doc.viewCount = Number(doc.viewCount || 0) + 1;
      doc.auditEvents.push({ action: "RECIPIENT_VIEWED", actorId: null, actorRole: "recipient" });
      await doc.save();
      return res.json({ success: true, data: exposeSharedDocument(doc) });
    } catch (error) { next(error); }
  }

  async sharedPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const token = String(req.params.token || "");
      if (!/^[a-f0-9]{64}$/.test(token)) return res.status(404).json({ success: false, message: "Invitation not found." });
      const doc: any = await TradeDocumentModel.findOne({ inviteTokenHash: tokenHash(token), isDeleted: { $ne: true } }).select("+inviteTokenHash");
      if (!doc || !doc.inviteExpiresAt || doc.inviteExpiresAt.getTime() < Date.now() || doc.inviteRevokedAt || doc.status === "DRAFT") return res.status(404).json({ success: false, message: "Invitation expired or unavailable." });
      doc.lastDownloadedAt = new Date(); doc.downloadCount = Number(doc.downloadCount || 0) + 1;
      doc.auditEvents.push({ action: "RECIPIENT_PDF_DOWNLOADED", actorId: null, actorRole: "recipient" });
      await doc.save();
      const pdf = buildDocumentPdf(doc.toObject());
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${String(doc.documentNumber).replace(/[^a-z0-9_-]+/gi, "-")}.pdf"`);
      return res.send(pdf);
    } catch (error) { next(error); }
  }

  async buyerDecision(req: Request, res: Response, next: NextFunction) {
    try {
      const decision = String(req.body?.decision || "").toUpperCase();
      if (!["ACCEPTED", "REJECTED"].includes(decision)) return res.status(400).json({ success: false, message: "Choose ACCEPTED or REJECTED." });
      const token = String(req.params.token || "");
      const doc: any = await TradeDocumentModel.findOne({ inviteTokenHash: tokenHash(token), type: "QUOTATION", status: "SENT", inviteRevokedAt: null, inviteExpiresAt: { $gt: new Date() } }).select("+inviteTokenHash");
      if (!doc) return res.status(404).json({ success: false, message: "Invitation expired or unavailable." });
      const associate: any = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
      if (!associate?.associateCompany || String(associate.associateCompany) !== String(doc.buyer?.companyId || "")) return res.status(403).json({ success: false, message: "This quotation is assigned to another buyer company." });
      doc.status = decision; doc.decision = decision; doc.decidedAt = new Date(); doc.decisionSource = "PORTAL";
      doc.auditEvents.push({ action: `QUOTATION_${decision}`, actorId: req.user?.id || null, actorRole: "buyer" }); await doc.save();
      return res.json({ success: true, data: exposeDocument(doc) });
    } catch (error) { next(error); }
  }

  async recordDecision(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ownedCommercialDocument(req, res); if (!result) return;
      const decision = String(req.body?.decision || "").toUpperCase();
      if (result.doc.type !== "QUOTATION" || result.doc.status !== "SENT" || !["ACCEPTED", "REJECTED"].includes(decision)) return res.status(409).json({ success: false, message: "Only an issued quotation awaiting a response can be decided." });
      result.doc.status = decision; result.doc.decision = decision; result.doc.decidedAt = req.body?.decidedAt ? new Date(req.body.decidedAt) : new Date(); result.doc.decisionSource = "SELLER_RECORDED"; result.doc.decisionReference = String(req.body?.reference || ""); result.doc.decisionNotes = String(req.body?.notes || ""); result.doc.decisionProofUrl = req.body?.proofUrl || null;
      result.doc.auditEvents.push({ action: `QUOTATION_${decision}_RECORDED`, actorId: req.user?.id || null, actorRole: "seller", metadata: { reference: result.doc.decisionReference } }); await result.doc.save();
      return res.json({ success: true, data: exposeDocument(result.doc) });
    } catch (error) { next(error); }
  }

  async revise(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ownedCommercialDocument(req, res); if (!result) return;
      if (result.doc.status === "DRAFT") return res.status(409).json({ success: false, message: "Edit the draft directly." });
      const root = result.doc.revisionOf || result.doc._id;
      const revision = await TradeDocumentModel.create({ ...result.doc.toObject(), _id: undefined, createdAt: undefined, updatedAt: undefined, documentNumber: await generateDocumentNumber(result.issuer._id, result.doc.type, buildCompanyCode(result.issuer)), revision: Number(result.doc.revision || 1) + 1, revisionOf: root, status: "DRAFT", issuedAt: null, decision: null, decidedAt: null, decisionSource: null, payments: [], inviteTokenHash: null, inviteExpiresAt: null, inviteRevokedAt: null, auditEvents: [{ action: "REVISION_CREATED", actorId: req.user?.id || null, actorRole: "seller", metadata: { sourceId: result.doc._id } }] });
      return res.status(201).json({ success: true, data: exposeDocument(revision) });
    } catch (error) { next(error); }
  }

  async revisions(req: Request, res: Response, next: NextFunction) {
    try { const result = await ownedCommercialDocument(req, res); if (!result) return; const root = result.doc.revisionOf || result.doc._id; const rows = await TradeDocumentModel.find({ ownerCompanyId: result.issuer._id, $or: [{ _id: root }, { revisionOf: root }] }).sort({ revision: 1 }).lean(); return res.json({ success: true, data: rows.map((row: any) => exposeDocument(row)) }); } catch (error) { next(error); }
  }

  async toInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ownedCommercialDocument(req, res); if (!result) return;
      if (result.doc.type !== "QUOTATION" || result.doc.status !== "ACCEPTED") return res.status(409).json({ success: false, message: "An accepted quotation is required." });
      const existing = await TradeDocumentModel.findOne({ ownerCompanyId: result.issuer._id, sourceQuotationId: result.doc._id }); if (existing) return res.json({ success: true, data: exposeDocument(existing) });
      const template = await resolveTemplateForRender("INVOICE", String(result.issuer._id));
      const invoice = await TradeDocumentModel.create({ ...result.doc.toObject(), _id: undefined, createdAt: undefined, updatedAt: undefined, type: "INVOICE", documentNumber: await generateDocumentNumber(result.issuer._id, "INVOICE", buildCompanyCode(result.issuer)), revision: 1, revisionOf: null, sourceQuotationId: result.doc._id, status: "DRAFT", validUntil: null, dueDate: req.body?.dueDate || null, issuedAt: null, templateSnapshot: template ? JSON.parse(JSON.stringify(template)) : null, decision: null, decidedAt: null, decisionSource: null, payments: [], inviteTokenHash: null, inviteExpiresAt: null, inviteRevokedAt: null, auditEvents: [{ action: "CREATED_FROM_QUOTATION", actorId: req.user?.id || null, actorRole: "seller", metadata: { quotationId: result.doc._id } }] });
      return res.status(201).json({ success: true, data: exposeDocument(invoice) });
    } catch (error: any) { if (error?.code === 11000) { const existing = await TradeDocumentModel.findOne({ sourceQuotationId: req.params.id }); return res.json({ success: true, data: exposeDocument(existing) }); } next(error); }
  }

  async addPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ownedCommercialDocument(req, res); if (!result) return;
      if (result.doc.type !== "INVOICE" || result.doc.status === "DRAFT") return res.status(409).json({ success: false, message: "Only issued invoices can receive payments." });
      const amount = round2(Number(req.body?.amount)); const current = exposeDocument(result.doc);
      if (!Number.isFinite(amount) || amount <= 0 || amount > current.balanceDue) return res.status(400).json({ success: false, message: "Payment amount must be positive and cannot exceed the balance due." });
      result.doc.payments.push({ amount, paidAt: req.body?.paidAt ? new Date(req.body.paidAt) : new Date(), reference: String(req.body?.reference || ""), notes: String(req.body?.notes || ""), recordedBy: req.user?.id || null });
      result.doc.auditEvents.push({ action: "PAYMENT_RECORDED", actorId: req.user?.id || null, actorRole: "seller", metadata: { amount, reference: req.body?.reference || "" } }); await result.doc.save();
      return res.json({ success: true, data: exposeDocument(result.doc) });
    } catch (error) { next(error); }
  }

  async pdf(req: Request, res: Response, next: NextFunction) {
    try { const result = await ownedCommercialDocument(req, res); if (!result) return; const pdf = buildDocumentPdf(result.doc.toObject()); res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename="${String(result.doc.documentNumber).replace(/[^a-z0-9_-]+/gi, "-")}.pdf"`); return res.send(pdf); } catch (error) { next(error); }
  }

  async emailDocument(_req: Request, res: Response, _next: NextFunction) {
    return res.status(410).json({ success: false, message: "Document email delivery is disabled. Download the PDF or copy an invitation link." });
    /* legacy delivery intentionally disabled
    try {
      const role = normalizeRole(req.user?.role);
      const isPrivileged = isAdminRole(role) || isOperatorRole(role);
      if (!isPrivileged) {
        return res.status(403).json({ success: false, message: "Only admin/operator can email documents." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid document id." });
      }

      const doc = await TradeDocumentModel.findById(id).lean();
      if (!doc || (doc as any).isDeleted) {
        return res.status(404).json({ success: false, message: "Document not found." });
      }

      const enquiry = (doc as any)?.enquiryId ? await InquiryModel.findById((doc as any).enquiryId).lean() : null;
      const docType = String((doc as any)?.type || "").toUpperCase();
      const recipientRole = String(req.body?.recipientRole || "").toUpperCase();

      const buyerEmail = String((doc as any)?.buyer?.email || "");
      const sellerEmail = String((doc as any)?.seller?.email || "");
      const recipients: string[] = [];

      if (!recipientRole || recipientRole === "BOTH") {
        if (buyerEmail) recipients.push(buyerEmail);
        if (sellerEmail) recipients.push(sellerEmail);
      } else if (recipientRole === "BUYER" && buyerEmail) {
        recipients.push(buyerEmail);
      } else if (recipientRole === "SELLER" && sellerEmail) {
        recipients.push(sellerEmail);
      }

      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: "No recipients available for this document." });
      }

      const template = buildTradeDocumentEmail({
        docType,
        documentNumber: String((doc as any)?.documentNumber || ""),
        status: String((doc as any)?.status || ""),
        enquiryCode: (enquiry as any)?.code || (enquiry as any)?.enquiryNumber || "",
        buyerName: String((doc as any)?.buyer?.name || ""),
        sellerName: String((doc as any)?.seller?.name || ""),
        createdAt: (doc as any)?.createdAt ? new Date((doc as any).createdAt).toDateString() : "",
      });

      for (const email of recipients) {
        await sendTradeDocumentEmail(email, template.subject, template.htmlPart, template.textPart);
      }

      return res.status(200).json({ success: true, message: "Document emailed successfully." });
    } catch (error) {
      next(error);
    }
    */
  }

  async autoCreateQuotationForInquiry(inquiryId: Types.ObjectId, inventoryReservationId?: Types.ObjectId | null) {
    const existingDocs = await TradeDocumentModel.find({ enquiryId: inquiryId, type: "QUOTATION", isDeleted: { $ne: true } }).lean();
    const existingScopes = new Set(existingDocs.map((doc: any) => String(doc?.audienceScope || "SELLER_OBAOL").toUpperCase()));
    if (existingDocs.length >= 2 && existingScopes.has("SELLER_OBAOL") && existingScopes.has("OBAOL_BUYER")) {
      return existingDocs[0] as any;
    }

    const enquiry = await InquiryModel.findById(inquiryId);
    if (!enquiry) return null;

    const snapshot = await buildSnapshotFromEnquiry(enquiry as any, inventoryReservationId || undefined);
    const sellerCompanyId = snapshot.seller?.companyId || null;
    if (!sellerCompanyId) return null;

    const obaolCompanyId = await resolveObaolCompanyId();
    if (!obaolCompanyId) return null;

    const [sellerCompany, obaolCompany] = await Promise.all([
      AssociateCompanyModel.findById(sellerCompanyId).select("name slug email phone address gstin").lean(),
      AssociateCompanyModel.findById(obaolCompanyId).select("name slug email phone address gstin").lean(),
    ]);
    if (!obaolCompany) return null;

    const sellerCompanyCode = buildCompanyCode(sellerCompany);
    const obaolCompanyCode = buildCompanyCode(obaolCompany);
    const sellerDocNumber = await generateDocumentNumber(new Types.ObjectId(String(sellerCompanyId)), "QUOTATION", sellerCompanyCode);
    const obaolDocNumber = await generateDocumentNumber(obaolCompanyId, "QUOTATION", obaolCompanyCode);

    const obaolSnapshot = {
      associateId: null,
      companyId: obaolCompanyId,
      name: String(obaolCompany?.name || "").trim(),
      email: String(obaolCompany?.email || "").trim(),
      phone: String(obaolCompany?.phone || "").trim(),
      address: String(obaolCompany?.address || "").trim(),
      gstin: String(obaolCompany?.gstin || "").trim(),
    };

    const basePayload = {
      type: "QUOTATION",
      status: "DRAFT",
      enquiryId: enquiry._id,
      inventoryReservationId: snapshot.inventoryReservationId || null,
      lineItems: snapshot.lineItems,
      totals: snapshot.totals,
      terms: snapshot.terms,
      createdBy: null,
    };

    const createdSellerObaol = existingScopes.has("SELLER_OBAOL")
      ? existingDocs.find((doc: any) => String(doc?.audienceScope || "SELLER_OBAOL").toUpperCase() === "SELLER_OBAOL")
      : await TradeDocumentModel.create({
          ...basePayload,
          documentNumber: sellerDocNumber,
          buyer: obaolSnapshot,
          seller: snapshot.seller,
          audienceScope: "SELLER_OBAOL",
        });

    if (!existingScopes.has("OBAOL_BUYER")) {
      await TradeDocumentModel.create({
        ...basePayload,
        documentNumber: obaolDocNumber,
        buyer: snapshot.buyer,
        seller: obaolSnapshot,
        audienceScope: "OBAOL_BUYER",
      });
    }

    return createdSellerObaol as any;
  }

  async autoCreateLoiForInquiry(inquiryId: Types.ObjectId, inventoryReservationId?: Types.ObjectId | null) {
    const existingDocs = await TradeDocumentModel.find({ enquiryId: inquiryId, type: "LOI", isDeleted: { $ne: true } }).lean();
    const existingScopes = new Set(existingDocs.map((doc: any) => String(doc?.audienceScope || "SELLER_OBAOL").toUpperCase()));
    if (existingDocs.length >= 2 && existingScopes.has("SELLER_OBAOL") && existingScopes.has("OBAOL_BUYER")) {
      return existingDocs[0] as any;
    }

    const enquiry = await InquiryModel.findById(inquiryId);
    if (!enquiry) return null;

    const snapshot = await buildSnapshotFromEnquiry(enquiry as any, inventoryReservationId || undefined);
    const sellerCompanyId = snapshot.seller?.companyId || null;
    if (!sellerCompanyId) return null;

    const obaolCompanyId = await resolveObaolCompanyId();
    if (!obaolCompanyId) return null;

    const [sellerCompany, obaolCompany] = await Promise.all([
      AssociateCompanyModel.findById(sellerCompanyId).select("name slug email phone address gstin").lean(),
      AssociateCompanyModel.findById(obaolCompanyId).select("name slug email phone address gstin").lean(),
    ]);
    if (!obaolCompany) return null;

    const sellerCompanyCode = buildCompanyCode(sellerCompany);
    const obaolCompanyCode = buildCompanyCode(obaolCompany);
    const sellerDocNumber = await generateDocumentNumber(new Types.ObjectId(String(sellerCompanyId)), "LOI", sellerCompanyCode);
    const obaolDocNumber = await generateDocumentNumber(obaolCompanyId, "LOI", obaolCompanyCode);

    const obaolSnapshot = {
      associateId: null,
      companyId: obaolCompanyId,
      name: String(obaolCompany?.name || "").trim(),
      email: String(obaolCompany?.email || "").trim(),
      phone: String(obaolCompany?.phone || "").trim(),
      address: String(obaolCompany?.address || "").trim(),
      gstin: String(obaolCompany?.gstin || "").trim(),
    };

    const basePayload = {
      type: "LOI",
      status: "SENT",
      enquiryId: enquiry._id,
      inventoryReservationId: snapshot.inventoryReservationId || null,
      lineItems: snapshot.lineItems,
      totals: snapshot.totals,
      terms: snapshot.terms,
      createdBy: null,
    };

    const createdSellerObaol = existingScopes.has("SELLER_OBAOL")
      ? existingDocs.find((doc: any) => String(doc?.audienceScope || "SELLER_OBAOL").toUpperCase() === "SELLER_OBAOL")
      : await TradeDocumentModel.create({
          ...basePayload,
          documentNumber: sellerDocNumber,
          buyer: obaolSnapshot,
          seller: snapshot.seller,
          audienceScope: "SELLER_OBAOL",
        });

    if (!existingScopes.has("OBAOL_BUYER")) {
      await TradeDocumentModel.create({
        ...basePayload,
        documentNumber: obaolDocNumber,
        buyer: snapshot.buyer,
        seller: obaolSnapshot,
        audienceScope: "OBAOL_BUYER",
      });
    }

    return createdSellerObaol as any;
  }
}

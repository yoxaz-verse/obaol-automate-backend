import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { DocumentSequenceModel } from "../database/models/documentSequence";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { IInquiry } from "../interfaces/enquiry";
import { DocumentRuleModel } from "../database/models/documentRule";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isOperatorRole = (role: string) => role === "operator" || role === "team";
const isAssociateRole = (role: string) => role === "associate";

const typeShort: Record<string, string> = {
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
};

const resolveInquiryWorkflowStage = (enquiry: any) => {
  if (enquiry?.workflowStage) return String(enquiry.workflowStage).toUpperCase();
  if (enquiry?.order) return "ORDER_CONFIRMED";
  if (enquiry?.buyerConfirmedAt) return "PURCHASE_ORDER_RECEIVED";
  if (enquiry?.sellerAcceptedAt) return "QUOTATION_SUBMITTED";
  return "INQUIRY_CREATED";
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
      { path: "preferredIncoterm", select: "code name" },
    ])
    .lean();

  if (!populated) throw new Error("Inquiry not found.");

  const buyerAssociate: any = populated.buyerAssociateId || {};
  const sellerAssociate: any = populated.sellerAssociateId || {};
  const buyerCompany: any = buyerAssociate.associateCompany || {};
  const sellerCompany: any = sellerAssociate.associateCompany || {};

  const ratePerKg = Number((populated as any).rate || (populated as any)?.variantRateId?.rate || 0);
  const commissionPerKg = Number(populated.adminCommission || 0) + Number(populated.mediatorCommission || 0);
  const quantityMT = Number(populated.quantity || 0);
  const { qtyKg, subtotal, commissionTotal, grandTotal } = computeTotals(ratePerKg, commissionPerKg, quantityMT, 0);

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
      taxAmount: 0,
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
        "PAYMENT_ADVICE"
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
      if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry is required to create document." });

      const stageType = enquiryId ? "INQUIRY" : "ORDER";
      const stageKey = stageType === "INQUIRY" ? resolveInquiryWorkflowStage(enquiry) : resolveOrderWorkflowStage(order);
      const rule = await DocumentRuleModel.findOne({
        docType: type,
        stageType,
        stageKey,
        isActive: true,
        isDeleted: { $ne: true },
      }).lean();

      if (!isPrivileged) {
        if (!rule) {
          return res.status(403).json({ success: false, message: "Only admin/operator can create documents." });
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

      const sellerCompany = await AssociateCompanyModel.findById(sellerCompanyId).select("name slug").lean();
      const companyCode = buildCompanyCode(sellerCompany);
      const documentNumber = await generateDocumentNumber(new Types.ObjectId(String(sellerCompanyId)), type, companyCode);

      const created = await TradeDocumentModel.create({
        type,
        status: req.body?.status || "DRAFT",
        documentNumber,
        fileUrl: req.body?.fileUrl || null,
        uploadedBy: req.user?.id || null,
        verifiedStatus: req.body?.verifiedStatus || "PENDING",
        enquiryId: enquiry._id,
        orderId: orderId || null,
        inventoryReservationId: snapshot.inventoryReservationId || null,
        buyer: snapshot.buyer,
        seller: snapshot.seller,
        lineItems: snapshot.lineItems,
        totals: snapshot.totals,
        terms: { ...snapshot.terms, ...(req.body?.terms || {}) },
        createdBy: req.user?.id || null,
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
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

      const query: any = { isDeleted: { $ne: true } };
      if (status) query.status = status;
      if (type) query.type = type;
      if (enquiryId) query.enquiryId = enquiryId;
      if (orderId) query.orderId = orderId;
      if (companyId) query["seller.companyId"] = companyId;

      if (isAdminRole(role) || isOperatorRole(role)) {
        // full access
      } else if (isAssociateRole(role)) {
        query.$or = [
          { "buyer.associateId": new Types.ObjectId(userId) },
          { "seller.associateId": new Types.ObjectId(userId) },
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
      if (isAssociateRole(role)) {
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
          data: filteredRows,
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

      if (isAdminRole(role) || isOperatorRole(role)) {
        // ok
      } else if (isAssociateRole(role)) {
        const buyerId = String((doc as any)?.buyer?.associateId || "");
        const sellerId = String((doc as any)?.seller?.associateId || "");
        if (buyerId !== userId && sellerId !== userId) {
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

      return res.status(200).json({ success: true, data: doc });
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

      if (!isPrivileged) {
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

      const updatePayload: any = isPrivileged
        ? {
          status: req.body?.status || (existing as any).status,
          terms: nextTerms,
          totals: nextTotals,
        }
        : {};
      if (req.body?.fileUrl !== undefined) {
        updatePayload.fileUrl = req.body.fileUrl || null;
        updatePayload.uploadedBy = req.user?.id || null;
      }
      if (isPrivileged && req.body?.verifiedStatus) {
        updatePayload.verifiedStatus = req.body.verifiedStatus;
      }
      if (req.body?.orderId && Types.ObjectId.isValid(String(req.body.orderId))) {
        updatePayload.orderId = new Types.ObjectId(String(req.body.orderId));
      }

      const updated = await TradeDocumentModel.findByIdAndUpdate(id, updatePayload, { new: true });
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async autoCreateQuotationForInquiry(inquiryId: Types.ObjectId, inventoryReservationId?: Types.ObjectId | null) {
    const existing = await TradeDocumentModel.findOne({ enquiryId: inquiryId, type: "QUOTATION", isDeleted: { $ne: true } });
    if (existing) return existing;

    const enquiry = await InquiryModel.findById(inquiryId);
    if (!enquiry) return null;

    const snapshot = await buildSnapshotFromEnquiry(enquiry as any, inventoryReservationId || undefined);
    const sellerCompanyId = snapshot.seller?.companyId || null;
    if (!sellerCompanyId) return null;

    const sellerCompany = await AssociateCompanyModel.findById(sellerCompanyId).select("name slug").lean();
    const companyCode = buildCompanyCode(sellerCompany);
    const documentNumber = await generateDocumentNumber(new Types.ObjectId(String(sellerCompanyId)), "QUOTATION", companyCode);

    return TradeDocumentModel.create({
      type: "QUOTATION",
      status: "DRAFT",
      documentNumber,
      enquiryId: enquiry._id,
      inventoryReservationId: snapshot.inventoryReservationId || null,
      buyer: snapshot.buyer,
      seller: snapshot.seller,
      lineItems: snapshot.lineItems,
      totals: snapshot.totals,
      terms: snapshot.terms,
      createdBy: null,
    });
  }
}

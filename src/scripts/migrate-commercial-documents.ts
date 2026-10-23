import dotenv from "dotenv";
import mongoose from "mongoose";
import { CommercialDocumentModel } from "../database/models/commercialDocument";
import { TradeDocumentModel } from "../database/models/tradeDocument";

dotenv.config();

async function run() {
  const uri = String(process.env.MONGODB_URI || process.env.MONGO_URI || "");
  if (!uri) throw new Error("MONGODB_URI is missing.");
  await mongoose.connect(uri);
  let migrated = 0;
  let skipped = 0;
  for await (const legacy of CommercialDocumentModel.find({}).cursor()) {
    if (await TradeDocumentModel.exists({ legacyCommercialDocumentId: legacy._id })) { skipped += 1; continue; }
    const sourceQuotation = legacy.sourceQuotationId
      ? await TradeDocumentModel.findOne({ legacyCommercialDocumentId: legacy.sourceQuotationId }).select("_id").lean()
      : null;
    const revisionRoot = legacy.revisionOf
      ? await TradeDocumentModel.findOne({ legacyCommercialDocumentId: legacy.revisionOf }).select("_id").lean()
      : null;
    const items = (legacy.items || []).map((item: any) => ({
      productId: item.productId || null, productName: item.description, description: item.description,
      quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, ratePerKg: String(item.unit).toUpperCase() === "KG" ? item.unitPrice : 0,
      amount: item.subtotal, taxRate: item.taxRate, taxAmount: item.taxAmount, total: item.total,
    }));
    await TradeDocumentModel.create({
      legacyCommercialDocumentId: legacy._id, ownerCompanyId: legacy.ownerCompanyId, customerId: legacy.customerId,
      type: legacy.type, status: legacy.status === "DECLINED" ? "REJECTED" : legacy.status,
      documentNumber: legacy.number, revision: legacy.revision || 1, revisionOf: revisionRoot?._id || null,
      sourceQuotationId: sourceQuotation?._id || null, issueDate: legacy.issueDate, validUntil: legacy.validUntil,
      buyer: { name: legacy.recipient?.name, email: legacy.recipient?.email, phone: legacy.recipient?.phone, address: legacy.recipient?.billingAddress, gstin: legacy.recipient?.gstin },
      seller: { companyId: legacy.ownerCompanyId, name: legacy.issuer?.name, email: legacy.issuer?.email, phone: legacy.issuer?.phone, address: legacy.issuer?.billingAddress, gstin: legacy.issuer?.gstin },
      lineItems: items,
      totals: { currency: legacy.currency, subtotal: legacy.subtotal, commissionTotal: 0, taxAmount: legacy.taxAmount, discountAmount: 0, grandTotal: legacy.total },
      terms: { paymentTerms: legacy.terms || "", notes: legacy.notes || "" }, issuedAt: legacy.sentAt,
      decision: legacy.decision === "DECLINED" ? "REJECTED" : legacy.decision, decidedAt: legacy.decidedAt,
      decisionSource: legacy.decision ? "SELLER_RECORDED" : null, decisionReference: legacy.decidedByEmail || "",
      payments: legacy.paymentStatus === "PAID" ? [{ amount: legacy.total || 0, paidAt: legacy.paymentRecordedAt || legacy.updatedAt, reference: legacy.paymentReference || "", notes: "Migrated payment" }] : [],
      auditEvents: [{ action: "MIGRATED_FROM_COMMERCIAL_DOCUMENT", metadata: { legacyId: legacy._id } }],
      createdAt: legacy.createdAt, updatedAt: legacy.updatedAt,
    });
    migrated += 1;
  }
  for await (const legacy of CommercialDocumentModel.find({ $or: [{ sourceQuotationId: { $ne: null } }, { revisionOf: { $ne: null } }] }).cursor()) {
    const target = await TradeDocumentModel.findOne({ legacyCommercialDocumentId: legacy._id });
    if (!target) continue;
    if (legacy.sourceQuotationId) {
      const source = await TradeDocumentModel.findOne({ legacyCommercialDocumentId: legacy.sourceQuotationId }).select("_id").lean();
      if (source) target.sourceQuotationId = source._id;
    }
    if (legacy.revisionOf) {
      const root = await TradeDocumentModel.findOne({ legacyCommercialDocumentId: legacy.revisionOf }).select("_id").lean();
      if (root) target.revisionOf = root._id;
    }
    await target.save();
  }
  console.log(`Commercial documents migrated: ${migrated}; skipped: ${skipped}`);
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());

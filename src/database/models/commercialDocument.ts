import mongoose, { Schema } from "mongoose";

export const CommercialCustomerModel = mongoose.model("CommercialCustomer", new Schema({
  ownerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  linkedCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: "" },
  billingAddress: { type: String, required: true },
  gstin: { type: String, default: "" },
  contactName: { type: String, required: true },
}, { timestamps: true }));

const sequenceSchema = new Schema({
  ownerCompanyId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  year: { type: Number, required: true },
  value: { type: Number, required: true, default: 0 },
});
sequenceSchema.index({ ownerCompanyId: 1, type: 1, year: 1 }, { unique: true });
export const CommercialSequenceModel = mongoose.model("CommercialSequence", sequenceSchema);

const lineSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const partySchema = new Schema({
  name: String, email: String, phone: String, billingAddress: String,
  gstin: String, contactName: String, logo: String,
}, { _id: false });

const commercialDocumentSchema = new Schema({
  ownerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: "CommercialCustomer", required: true },
  type: { type: String, enum: ["QUOTATION", "INVOICE"], required: true },
  number: { type: String, required: true, unique: true },
  revision: { type: Number, default: 1 },
  revisionOf: { type: Schema.Types.ObjectId, ref: "CommercialDocument", default: null },
  sourceQuotationId: { type: Schema.Types.ObjectId, ref: "CommercialDocument", default: null },
  status: { type: String, enum: ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "CANCELLED"], default: "DRAFT" },
  paymentStatus: { type: String, enum: ["UNPAID", "PAID"], default: "UNPAID" },
  paymentRecordedAt: { type: Date, default: null },
  paymentReference: { type: String, default: "" },
  issuer: { type: partySchema, required: true },
  recipient: { type: partySchema, required: true },
  items: { type: [lineSchema], default: [] },
  currency: { type: String, default: "INR" },
  subtotal: Number, taxAmount: Number, total: Number,
  issueDate: { type: Date, required: true },
  validUntil: { type: Date, default: null },
  terms: { type: String, default: "" },
  notes: { type: String, default: "" },
  sentAt: { type: Date, default: null },
  shareTokenHash: { type: String, default: null, select: false },
  shareExpiresAt: { type: Date, default: null },
  shareRevokedAt: { type: Date, default: null },
  codeHash: { type: String, default: null, select: false },
  codeExpiresAt: { type: Date, default: null },
  codeSentAt: { type: Date, default: null },
  codeAttempts: { type: Number, default: 0 },
  decision: { type: String, enum: ["ACCEPTED", "DECLINED", null], default: null },
  decidedAt: { type: Date, default: null },
  decidedByEmail: { type: String, default: null },
}, { timestamps: true });
commercialDocumentSchema.index({ ownerCompanyId: 1, createdAt: -1 });
commercialDocumentSchema.index({ shareTokenHash: 1 }, { sparse: true });
commercialDocumentSchema.index({ ownerCompanyId: 1, sourceQuotationId: 1 }, { unique: true, partialFilterExpression: { sourceQuotationId: { $type: "objectId" } } });
export const CommercialDocumentModel = mongoose.model("CommercialDocument", commercialDocumentSchema);

import mongoose, { Schema } from "mongoose";

const money = { type: Number, default: 0, min: 0 };

const GstRegistrationSchema = new Schema({
  ownerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  gstin: { type: String, required: true, uppercase: true, trim: true },
  legalName: { type: String, required: true, trim: true }, tradeName: { type: String, default: "", trim: true },
  stateCode: { type: String, required: true, match: /^\d{2}$/ }, filingFrequency: { type: String, enum: ["MONTHLY", "QRMP"], default: "MONTHLY" },
  invoiceSeries: { prefix: { type: String, default: "INV" }, nextNumber: { type: Number, default: 1, min: 1 } },
  provider: { key: { type: String, default: "mock" }, environment: { type: String, enum: ["SANDBOX", "PRODUCTION"], default: "SANDBOX" }, connected: { type: Boolean, default: false }, credentialCiphertext: { type: String, select: false, default: "" } },
  authorizedUserIds: [{ type: Schema.Types.ObjectId }], isActive: { type: Boolean, default: true }, createdBy: { type: Schema.Types.ObjectId },
}, { timestamps: true });
GstRegistrationSchema.index({ ownerCompanyId: 1, gstin: 1 }, { unique: true });

const taxSchema = { taxableValue: money, cgst: money, sgst: money, igst: money, cess: money };
const GstPurchaseSchema = new Schema({
  ownerCompanyId: { type: Schema.Types.ObjectId, required: true, index: true }, registrationId: { type: Schema.Types.ObjectId, ref: "GstRegistration", required: true, index: true },
  supplierGstin: { type: String, uppercase: true, trim: true, default: "" }, supplierName: { type: String, required: true, trim: true },
  invoiceNumber: { type: String, required: true, trim: true }, invoiceDate: { type: Date, required: true, index: true }, placeOfSupply: { type: String, required: true, match: /^\d{2}$/ },
  invoiceType: { type: String, enum: ["REGULAR", "CREDIT_NOTE", "DEBIT_NOTE", "IMPORT_GOODS", "IMPORT_SERVICES"], default: "REGULAR" },
  reverseCharge: { type: Boolean, default: false }, itcEligibility: { type: String, enum: ["ELIGIBLE", "BLOCKED", "INELIGIBLE", "REVERSAL"], default: "ELIGIBLE" },
  hsnSac: { type: String, default: "", trim: true }, taxRate: { type: Number, default: 0, min: 0, max: 100 }, ...taxSchema,
  totalValue: money, notes: { type: String, default: "" }, source: { type: String, enum: ["MANUAL", "EXCEL"], default: "MANUAL" }, createdBy: { type: Schema.Types.ObjectId },
}, { timestamps: true });
GstPurchaseSchema.index({ registrationId: 1, supplierGstin: 1, invoiceNumber: 1, invoiceDate: 1 }, { unique: true });

const GstAdjustmentSchema = new Schema({
  ownerCompanyId: { type: Schema.Types.ObjectId, required: true, index: true }, registrationId: { type: Schema.Types.ObjectId, required: true, index: true }, period: { type: String, required: true, match: /^\d{6}$/ },
  kind: { type: String, enum: ["ADVANCE", "ADVANCE_ADJUSTMENT", "ITC_REVERSAL", "ITC_RECLAIM", "NIL_EXEMPT_NONGST", "OTHER"], required: true }, description: { type: String, required: true }, ...taxSchema,
  createdBy: { type: Schema.Types.ObjectId },
}, { timestamps: true });

const GstReturnSchema = new Schema({
  ownerCompanyId: { type: Schema.Types.ObjectId, required: true, index: true }, registrationId: { type: Schema.Types.ObjectId, ref: "GstRegistration", required: true, index: true }, period: { type: String, required: true, match: /^\d{6}$/ },
  returnType: { type: String, enum: ["GSTR1", "GSTR3B"], required: true }, version: { type: Number, default: 1 }, status: { type: String, enum: ["DRAFT", "READY", "OTP_PENDING", "SUBMITTED", "FILED", "REJECTED"], default: "DRAFT", index: true },
  snapshot: { type: Schema.Types.Mixed, required: true }, sourceHash: { type: String, required: true }, validation: { errors: [String], warnings: [String] }, totals: { type: Schema.Types.Mixed, default: {} },
  filingAttempts: { type: [{ provider: String, requestId: String, status: String, errorCode: String, errorMessage: String, createdAt: { type: Date, default: Date.now } }], default: [] },
  acknowledgementNumber: String, arn: String, filedAt: Date, createdBy: { type: Schema.Types.ObjectId }, audit: { type: [{ action: String, actorId: Schema.Types.ObjectId, metadata: Schema.Types.Mixed, at: { type: Date, default: Date.now } }], default: [] },
}, { timestamps: true });
GstReturnSchema.index({ registrationId: 1, period: 1, returnType: 1, version: 1 }, { unique: true });

export const GstRegistrationModel = mongoose.model("GstRegistration", GstRegistrationSchema);
export const GstPurchaseModel = mongoose.model("GstPurchase", GstPurchaseSchema);
export const GstAdjustmentModel = mongoose.model("GstAdjustment", GstAdjustmentSchema);
export const GstReturnModel = mongoose.model("GstReturn", GstReturnSchema);

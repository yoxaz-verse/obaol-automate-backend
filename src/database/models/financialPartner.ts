import mongoose, { Schema } from "mongoose";

export const FINANCIAL_PARTNER_TYPES = ["BANK", "NBFC", "TRADE_FINANCE", "FINANCIAL_ADVISOR", "INSURER", "BROKER"] as const;
export const FINANCIAL_OFFERING_TYPES = ["WORKING_CAPITAL", "PURCHASE_ORDER_FINANCE", "INVOICE_DISCOUNTING", "EXPORT_FINANCE", "IMPORT_FINANCE", "LETTER_OF_CREDIT", "BANK_GUARANTEE", "INSURANCE", "ADVISORY", "OTHER"] as const;
export const FINANCIAL_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "ELIGIBLE", "DECLINED", "TERMS_OFFERED", "ACCEPTED", "WITHDRAWN", "CLOSED"] as const;

const LocationSchema = new Schema({
  label: { type: String, required: true, trim: true }, address: { type: String, default: "", trim: true },
  country: { type: String, required: true, trim: true }, state: { type: String, default: "", trim: true }, city: { type: String, default: "", trim: true },
  latitude: { type: Number, min: -90, max: 90 }, longitude: { type: Number, min: -180, max: 180 },
}, { _id: true });

const CredentialSchema = new Schema({
  kind: { type: String, required: true, trim: true }, issuer: { type: String, required: true, trim: true },
  number: { type: String, default: "", trim: true }, validTo: Date, evidenceUrl: { type: String, default: "", trim: true },
  verificationStatus: { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING" },
}, { _id: true });

const OfferingSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 }, type: { type: String, enum: FINANCIAL_OFFERING_TYPES, required: true, index: true },
  summary: { type: String, default: "", trim: true, maxlength: 1500 }, currencies: [{ type: String, uppercase: true, trim: true }],
  minimumAmount: { type: Number, min: 0, default: 0 }, maximumAmount: { type: Number, min: 0, default: null },
  minimumTurnover: { type: Number, min: 0, default: 0 }, minimumOperatingYears: { type: Number, min: 0, default: 0 },
  applicantTypes: [{ type: String, trim: true }], industries: [{ type: String, trim: true }], commodities: [{ type: String, trim: true }], markets: [{ type: String, trim: true }],
  collateralRequirement: { type: String, enum: ["NONE", "OPTIONAL", "REQUIRED", "CASE_BY_CASE"], default: "CASE_BY_CASE" },
  tenureDescription: { type: String, default: "", trim: true }, pricingDescription: { type: String, default: "", trim: true },
  processingDays: { type: Number, min: 0, default: null }, requiredDocuments: [{ type: String, trim: true }], eligibilityNotes: { type: String, default: "", trim: true }, exclusions: { type: String, default: "", trim: true },
  status: { type: String, enum: ["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"], default: "DRAFT" },
}, { _id: true });

const SnapshotSchema = new Schema({
  displayName: { type: String, required: true, trim: true }, partnerTypes: [{ type: String, enum: FINANCIAL_PARTNER_TYPES }],
  summary: { type: String, default: "", trim: true, maxlength: 3000 }, contactEmail: { type: String, required: true, trim: true, lowercase: true }, contactPhone: { type: String, required: true, trim: true },
  website: { type: String, default: "", trim: true }, serviceRegions: [{ type: String, trim: true }], currencies: [{ type: String, uppercase: true, trim: true }], industries: [{ type: String, trim: true }], commodities: [{ type: String, trim: true }],
  locations: { type: [LocationSchema], default: [] }, credentials: { type: [CredentialSchema], default: [] }, offerings: { type: [OfferingSchema], default: [] },
}, { _id: false });

const FinancialPartnerProfileSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
  draft: { type: SnapshotSchema, default: null }, published: { type: SnapshotSchema, default: null },
  status: { type: String, enum: ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"], default: "DRAFT", index: true },
  reviewNotes: { type: String, default: "", trim: true }, submittedAt: Date, publishedAt: Date, reviewedBy: Schema.Types.ObjectId,
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, actorId: Schema.Types.ObjectId, note: { type: String, default: "" } }],
}, { timestamps: true });

FinancialPartnerProfileSchema.index({ status: 1, "published.partnerTypes": 1 }, { name: "financial_partner_types" });
FinancialPartnerProfileSchema.index({ status: 1, "published.offerings.type": 1 }, { name: "financial_offering_types" });
export const FinancialPartnerProfileModel = mongoose.model("FinancialPartnerProfile", FinancialPartnerProfileSchema);

const FinancialApplicationSchema = new Schema({
  profileId: { type: Schema.Types.ObjectId, ref: "FinancialPartnerProfile", required: true, index: true },
  offeringId: { type: Schema.Types.ObjectId, required: true, index: true }, applicantCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  partnerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, createdBy: { type: Schema.Types.ObjectId, required: true },
  requestedAmount: { type: Number, min: 0, required: true }, currency: { type: String, required: true, uppercase: true, trim: true }, purpose: { type: String, required: true, trim: true, maxlength: 3000 },
  tradeReference: { type: String, default: "", trim: true }, preferredBy: Date, notes: { type: String, default: "", trim: true, maxlength: 3000 },
  documents: [{ name: { type: String, required: true, trim: true }, url: { type: String, required: true, trim: true } }], consent: { type: Boolean, required: true },
  status: { type: String, enum: FINANCIAL_APPLICATION_STATUSES, default: "SUBMITTED", index: true },
  partnerNote: { type: String, default: "", trim: true }, informationRequest: { type: String, default: "", trim: true },
  activity: [{ action: { type: String, required: true }, actorId: Schema.Types.ObjectId, at: { type: Date, default: Date.now }, note: { type: String, default: "", trim: true } }],
}, { timestamps: true });
FinancialApplicationSchema.index({ applicantCompanyId: 1, profileId: 1, offeringId: 1, status: 1 });
export const FinancialApplicationModel = mongoose.model("FinancialApplication", FinancialApplicationSchema);

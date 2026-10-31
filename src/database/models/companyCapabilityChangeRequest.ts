import mongoose, { Schema } from "mongoose";

export const COMPANY_CAPABILITY_REQUEST_STATUSES = ["PENDING_REVIEW", "APPROVED", "REJECTED"] as const;

const CompanyCapabilityChangeRequestSchema = new Schema(
  {
    requesterAssociateId: { type: Schema.Types.ObjectId, ref: "Associate", required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true },
    requestedProvidedFunctionIds: [{ type: Schema.Types.ObjectId, ref: "CompanyFunction", required: true }],
    requestedSoughtFunctionIds: [{ type: Schema.Types.ObjectId, ref: "CompanyFunction", required: true }],
    requestedProvidedFunctionPriorities: [{ type: Schema.Types.ObjectId, ref: "CompanyFunction" }],
    requestedSoughtFunctionPriorities: [{ type: Schema.Types.ObjectId, ref: "CompanyFunction" }],
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: COMPANY_CAPABILITY_REQUEST_STATUSES, default: "PENDING_REVIEW", index: true },
    reviewNotes: { type: String, trim: true, maxlength: 2000, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    reviewedAt: { type: Date, default: null },
    legacyReportId: { type: Schema.Types.ObjectId, ref: "OrganizationReport", unique: true, sparse: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

CompanyCapabilityChangeRequestSchema.index({ companyId: 1, status: 1, createdAt: 1 });
CompanyCapabilityChangeRequestSchema.index(
  { companyId: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING_REVIEW", isDeleted: false } }
);

export const CompanyCapabilityChangeRequestModel = mongoose.model(
  "CompanyCapabilityChangeRequest",
  CompanyCapabilityChangeRequestSchema
);

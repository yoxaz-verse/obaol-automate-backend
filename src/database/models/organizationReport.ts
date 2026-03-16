import mongoose, { Schema } from "mongoose";

export const ORGANIZATION_REPORT_STATUSES = [
  "PENDING_REVIEW",
  "UNDER_REVIEW",
  "RESOLVED",
  "ACTION_TAKEN",
  "REJECTED",
] as const;

export const ORGANIZATION_REPORT_ACTIONS = [
  "NONE",
  "DEACTIVATE_ASSOCIATE",
  "REMOVE_FROM_COMPANY",
  "APPLY_COMPANY_INTERESTS",
  "REOPEN_INQUIRY_CREATE",
] as const;

export const ORGANIZATION_REPORT_REASONS = [
  "INACTIVE_MEMBER",
  "MISCONDUCT",
  "WRONG_COMPANY_LINK",
  "SPAM_BEHAVIOR",
  "PROFILE_ISSUE",
  "COMPANY_INTEREST_UPDATE",
  "REOPEN_INQUIRY_REQUEST",
  "OTHER",
] as const;

const OrganizationReportSchema = new Schema(
  {
    reporterAssociateId: {
      type: Schema.Types.ObjectId,
      ref: "Associate",
      required: true,
      index: true,
    },
    reporterCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "AssociateCompany",
      required: true,
      index: true,
    },
    targetAssociateId: {
      type: Schema.Types.ObjectId,
      ref: "Associate",
      required: true,
      index: true,
    },
    targetCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "AssociateCompany",
      required: true,
      index: true,
    },
    reasonCode: {
      type: String,
      enum: ORGANIZATION_REPORT_REASONS,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    payload: {
      requestedInterests: [{ type: String, trim: true }],
      inquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null },
      requestedBy: { type: Schema.Types.ObjectId, ref: "Associate", default: null },
      note: { type: String, trim: true, maxlength: 1000, default: "" },
      reopenedInquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null },
    },
    status: {
      type: String,
      enum: ORGANIZATION_REPORT_STATUSES,
      default: "PENDING_REVIEW",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    actionType: {
      type: String,
      enum: ORGANIZATION_REPORT_ACTIONS,
      default: "NONE",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

OrganizationReportSchema.index({ status: 1, createdAt: -1 });
OrganizationReportSchema.index({ reporterCompanyId: 1, createdAt: -1 });
OrganizationReportSchema.index({ targetAssociateId: 1, createdAt: -1 });

export const OrganizationReportModel = mongoose.model(
  "OrganizationReport",
  OrganizationReportSchema
);

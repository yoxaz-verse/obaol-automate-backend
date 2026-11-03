import mongoose, { Schema } from "mongoose";

export const REFERRAL_SHARE_TYPES = ["PRODUCT", "QUALITY_LAB", "PACKAGING", "FREIGHT", "INLAND_TRANSPORT", "WAREHOUSE"] as const;
export type ReferralShareType = typeof REFERRAL_SHARE_TYPES[number];

const AssociateReferralShareSchema = new Schema({
  referrerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  offeringType: { type: String, enum: REFERRAL_SHARE_TYPES, required: true, index: true },
  offeringId: { type: Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE", index: true },
  clickCount: { type: Number, default: 0, min: 0 },
  uniqueClickCount: { type: Number, default: 0, min: 0 },
  signupCount: { type: Number, default: 0, min: 0 },
  lastClickedAt: { type: Date, default: null },
}, { timestamps: true });

AssociateReferralShareSchema.index({ referrerCompanyId: 1, offeringType: 1, offeringId: 1 }, { unique: true });
AssociateReferralShareSchema.index({ referrerCompanyId: 1, createdAt: -1 });

export const AssociateReferralShareModel = mongoose.model("AssociateReferralShare", AssociateReferralShareSchema);

const AssociateReferralShareVisitSchema = new Schema({
  shareId: { type: Schema.Types.ObjectId, ref: "AssociateReferralShare", required: true, index: true },
  visitorHash: { type: String, required: true },
  dayBucket: { type: String, required: true },
  channel: { type: String, default: "DIRECT", trim: true, maxlength: 40 },
  firstVisitedAt: { type: Date, default: Date.now },
}, { timestamps: true });

AssociateReferralShareVisitSchema.index({ shareId: 1, visitorHash: 1, dayBucket: 1 }, { unique: true });
export const AssociateReferralShareVisitModel = mongoose.model("AssociateReferralShareVisit", AssociateReferralShareVisitSchema);

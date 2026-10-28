import mongoose, { Schema } from "mongoose";

export const REFERRAL_ACTIVITY_TYPES = [
  "LIVE_SUPPLY",
  "INQUIRY_CREATED",
  "INQUIRY_TAKEN",
  "RESERVATION_CONFIRMED",
  "WAREHOUSE_BOOKING",
  "ORDER_COMPLETED",
] as const;

export type ReferralActivityType = typeof REFERRAL_ACTIVITY_TYPES[number];

const AssociateReferralActivitySchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
    type: { type: String, enum: REFERRAL_ACTIVITY_TYPES, required: true, index: true },
    sourceEntityId: { type: Schema.Types.ObjectId, required: true },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

AssociateReferralActivitySchema.index(
  { companyId: 1, type: 1, sourceEntityId: 1 },
  { unique: true }
);
AssociateReferralActivitySchema.index({ companyId: 1, occurredAt: -1 });

export const AssociateReferralActivityModel = mongoose.model(
  "AssociateReferralActivity",
  AssociateReferralActivitySchema
);

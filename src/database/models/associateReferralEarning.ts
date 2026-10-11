import mongoose, { Schema } from "mongoose";

const AssociateReferralEarningSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    referrerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
    referredCompanyIds: [{ type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true }],
    profitBasis: { type: Number, required: true, min: 0 },
    poolPercent: { type: Number, required: true, min: 0, max: 100 },
    poolAmount: { type: Number, required: true, min: 0 },
    recipientCount: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["EARNED", "PAID", "VOID"], default: "EARNED", index: true },
  },
  { timestamps: true }
);

AssociateReferralEarningSchema.index({ orderId: 1, referrerCompanyId: 1 }, { unique: true });
AssociateReferralEarningSchema.index({ referrerCompanyId: 1, createdAt: -1 });

export const AssociateReferralEarningModel = mongoose.model(
  "AssociateReferralEarning",
  AssociateReferralEarningSchema
);

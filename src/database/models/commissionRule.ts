import mongoose, { Schema } from "mongoose";
import { ICommissionRule } from "../../interfaces/commissionRule";

const CommissionRuleSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    poolPercent: { type: Number, min: 0, max: 100, default: 30 },
    procurementPercent: { type: Number, min: 0, max: 100, default: 10 },
    handlerPercent: { type: Number, min: 0, max: 100, default: 10 },
    closerPercent: { type: Number, min: 0, max: 100, default: 40 },
    portfolioPercent: { type: Number, min: 0, max: 100, default: 30 },
    leadershipL1Percent: { type: Number, min: 0, max: 100, default: 12 },
    leadershipL2Percent: { type: Number, min: 0, max: 100, default: 8 },
    leadershipL3PoolPercent: { type: Number, min: 0, max: 100, default: 10 },
    leadershipL3MaxEachPercent: { type: Number, min: 0, max: 100, default: 5 },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true }
);

CommissionRuleSchema.pre("validate", function (next) {
  const rule = this as any;
  const parts = [
    Number(rule.closerPercent),
    Number(rule.portfolioPercent),
    Number(rule.leadershipL1Percent),
    Number(rule.leadershipL2Percent),
    Number(rule.leadershipL3PoolPercent),
  ];
  if (parts.some((value) => !Number.isFinite(value) || value < 0)) {
    this.invalidate("closerPercent", "Commission percentages must be non-negative numbers.");
    return next();
  }
  const total = Math.round(parts.reduce((sum, value) => sum + value, 0) * 100) / 100;
  if (total !== 100) {
    this.invalidate("closerPercent", "Commission split must total 100%.");
  }
  next();
});

export const CommissionRuleModel = mongoose.model<ICommissionRule>("CommissionRule", CommissionRuleSchema);

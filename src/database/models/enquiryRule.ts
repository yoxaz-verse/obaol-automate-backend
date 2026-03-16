import mongoose, { Schema } from "mongoose";
import { IEnquiryRule } from "../../interfaces/enquiryRule";

const EnquiryRuleSchema: Schema = new Schema(
  {
    stageKey: { type: String, required: true, index: true, unique: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    requiredActions: {
      type: [String],
      enum: ["SUPPLIER_ACCEPTED", "BUYER_CONFIRMED", "RESPONSIBILITIES_FINALIZED"],
      default: [],
    },
    triggersOrderCreation: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

EnquiryRuleSchema.index({ stageKey: 1 });
EnquiryRuleSchema.index({ sortOrder: 1 });

export const EnquiryRuleModel = mongoose.model<IEnquiryRule>(
  "EnquiryRule",
  EnquiryRuleSchema
);

import mongoose, { Schema } from "mongoose";
import { IFlowRule } from "../../interfaces/flowRule";

const FlowRuleSchema: Schema = new Schema(
  {
    flowType: {
      type: String,
      enum: [
        "TRADE_ENQUIRY",
        "TRADE_ORDER",
        "SAMPLING",
        "WAREHOUSE",
        "PROCUREMENT",
        "INLAND_TRANSPORTATION",
        "PACKAGING",
        "FREIGHT_FORWARDING",
        "INVENTORY",
        "CERTIFICATION",
        "QUALITY_QA",
        "WAREHOUSE",
      ],
      required: true,
      index: true,
    },
    stageKey: { type: String, required: true, index: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    requiredActions: { type: [String], default: [] },
    requiredActionMode: { type: String, enum: ["ALL", "ANY"], default: "ALL" },
    actionBy: { type: String, enum: ["BUYER", "SUPPLIER", "BOTH", "EITHER"], default: null },
    triggersOrderCreation: { type: Boolean, default: false },
    triggersClose: { type: Boolean, default: false },
    tradeType: { type: String, enum: ["DOMESTIC", "INTERNATIONAL", "BOTH"], default: "BOTH" },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

FlowRuleSchema.index({ flowType: 1, sortOrder: 1 });
FlowRuleSchema.index({ flowType: 1, stageKey: 1 }, { unique: true });

export const FlowRuleModel = mongoose.model<IFlowRule>("FlowRule", FlowRuleSchema);

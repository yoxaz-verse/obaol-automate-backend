import mongoose, { Schema } from "mongoose";
import { IDocumentRule } from "../../interfaces/documentRule";

const DocumentRuleSchema: Schema = new Schema(
  {
    docType: {
      type: String,
      required: true,
      index: true,
    },
    stageType: {
      type: String,
      enum: [
        "INQUIRY",
        "ORDER",
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
    stageKey: {
      type: String,
      required: true,
      index: true,
    },
    responsibleRole: {
      type: String,
      enum: ["BUYER", "SELLER", "OBAOL", "PACKAGING", "QUALITY", "TRANSPORT", "SHIPPING"],
      required: true,
    },
    actionType: {
      type: String,
      enum: ["CREATE", "UPLOAD"],
      required: true,
    },
    visibility: {
      type: String,
      enum: ["BUYER", "SELLER", "BOTH", "INTERNAL"],
      default: "BOTH",
    },
    tradeType: {
      type: String,
      enum: ["DOMESTIC", "INTERNATIONAL", "BOTH"],
      default: "BOTH",
    },
    isRequired: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

DocumentRuleSchema.index({ docType: 1, stageType: 1, stageKey: 1 });

export const DocumentRuleModel = mongoose.model<IDocumentRule>(
  "DocumentRule",
  DocumentRuleSchema
);

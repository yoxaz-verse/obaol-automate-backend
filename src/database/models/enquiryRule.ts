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
      enum: [
        "RESPONSIBILITIES_FINALIZED",
        "SUPPLIER_ACCEPTED",
        "BUYER_CONFIRMED",
        "CLARIFICATION_REQUESTED",
        "LOI_SUBMITTED",
        "SUPPLIER_QTY_CONFIRMED",
        "REVISION_REQUESTED",
        "QUOTATION_CREATED",
        "QUOTATION_ACCEPTED",
        "RETURN_TO_REVISION",
        "PROFORMA_CREATED",
        "OTHER_DOCS_UPLOADED",
        "OTHER_DOCS_SKIPPED",
        "PO_UPLOADED",
        "PO_SKIPPED",
      ],
      default: [],
    },
    requiredActionMode: { type: String, enum: ["ALL", "ANY"], default: "ALL" },
    actionBy: { type: String, enum: ["BUYER", "SUPPLIER", "BOTH", "EITHER"], default: null },
    triggersOrderCreation: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
EnquiryRuleSchema.index({ sortOrder: 1 });

export const EnquiryRuleModel = mongoose.model<IEnquiryRule>(
  "EnquiryRule",
  EnquiryRuleSchema
);

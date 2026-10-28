import mongoose, { Schema } from "mongoose";

const DocumentConversionRuleSchema = new Schema({
  name: { type: String, required: true, trim: true },
  sourceType: { type: String, required: true, index: true },
  sourceStatuses: { type: [String], default: ["ACCEPTED"] },
  targetKind: { type: String, enum: ["DOCUMENT", "ORDER"], required: true, index: true },
  targetDocumentType: { type: String, default: null },
  tradeType: { type: String, enum: ["DOMESTIC", "INTERNATIONAL", "BOTH"], default: "BOTH" },
  requiresConfirmation: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

DocumentConversionRuleSchema.index({ sourceType: 1, targetKind: 1, targetDocumentType: 1, isDeleted: 1 });

export const DocumentConversionRuleModel = mongoose.model("DocumentConversionRule", DocumentConversionRuleSchema);

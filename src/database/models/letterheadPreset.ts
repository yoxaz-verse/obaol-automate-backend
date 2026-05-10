import mongoose, { Schema } from "mongoose";
import { ILetterheadPreset } from "../../interfaces/letterheadPreset";

const LetterheadPresetSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    scope: { type: String, enum: ["GLOBAL", "COMPANY_OVERRIDE"], default: "GLOBAL", index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
    logoUrl: { type: String, default: "" },
    headerHtml: { type: String, default: "" },
    footerHtml: { type: String, default: "" },
    watermark: { type: String, default: "" },
    spacing: {
      top: { type: Number, default: 24 },
      bottom: { type: Number, default: 24 },
      left: { type: Number, default: 24 },
      right: { type: Number, default: 24 },
    },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const LetterheadPresetModel = mongoose.model<ILetterheadPreset>("LetterheadPreset", LetterheadPresetSchema);

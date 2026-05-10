import mongoose, { Schema } from "mongoose";
import { IDocumentType } from "../../interfaces/documentType";

const DocumentTypeSchema: Schema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    category: { type: String, enum: ["TRADE", "LEGAL", "GENERAL"], default: "TRADE", index: true },
    icon: { type: String, default: "" },
    defaultPageSetup: {
      size: { type: String, enum: ["A4"], default: "A4" },
      orientation: { type: String, enum: ["PORTRAIT", "LANDSCAPE"], default: "PORTRAIT" },
      marginTop: { type: Number, default: 24 },
      marginRight: { type: Number, default: 24 },
      marginBottom: { type: Number, default: 24 },
      marginLeft: { type: Number, default: 24 },
    },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const DocumentTypeModel = mongoose.model<IDocumentType>("DocumentType", DocumentTypeSchema);

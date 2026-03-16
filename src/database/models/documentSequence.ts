import mongoose, { Schema } from "mongoose";
import { IDocumentSequence } from "../../interfaces/documentSequence";

const DocumentSequenceSchema: Schema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
    docType: {
      type: String,
      enum: ["QUOTATION", "PROFORMA_INVOICE", "INVOICE", "PURCHASE_ORDER"],
      required: true,
      index: true,
    },
    year: { type: Number, required: true, index: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DocumentSequenceSchema.index({ companyId: 1, docType: 1, year: 1 }, { unique: true });

export const DocumentSequenceModel = mongoose.model<IDocumentSequence>(
  "DocumentSequence",
  DocumentSequenceSchema
);

import mongoose, { Schema } from "mongoose";

export const LAB_TAXONOMY_KINDS = ["TEST", "PARAMETER", "ACCREDITATION", "COMMODITY"] as const;

const LabTaxonomySchema = new Schema(
  {
    kind: { type: String, enum: LAB_TAXONOMY_KINDS, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    unit: { type: String, default: "", trim: true },
    method: { type: String, default: "", trim: true },
    parentIds: [{ type: Schema.Types.ObjectId, ref: "LabTaxonomy" }],
    status: { type: String, enum: ["ACTIVE", "REQUESTED", "REJECTED", "INACTIVE"], default: "ACTIVE", index: true },
    requestedByCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null },
    requestedBy: { type: Schema.Types.ObjectId, default: null },
    reviewNotes: { type: String, default: "", trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

LabTaxonomySchema.index({ kind: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const LabTaxonomyModel = mongoose.model("LabTaxonomy", LabTaxonomySchema);


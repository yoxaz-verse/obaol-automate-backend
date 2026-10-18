import mongoose, { Schema } from "mongoose";
import { SERVICE_DEPARTMENTS, SERVICE_TAXONOMY_KINDS } from "../../interfaces/serviceMarketplace";

const ServiceTaxonomySchema = new Schema({
  department: { type: String, enum: SERVICE_DEPARTMENTS, required: true, index: true },
  kind: { type: String, enum: SERVICE_TAXONOMY_KINDS, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  status: { type: String, enum: ["REQUESTED", "ACTIVE", "REJECTED"], default: "ACTIVE", index: true },
  requestedBy: { type: Schema.Types.ObjectId, default: null },
  reviewedBy: { type: Schema.Types.ObjectId, default: null },
  reviewNotes: { type: String, default: "", trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });
ServiceTaxonomySchema.index({ department: 1, kind: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
export const ServiceTaxonomyModel = mongoose.model("ServiceTaxonomy", ServiceTaxonomySchema);

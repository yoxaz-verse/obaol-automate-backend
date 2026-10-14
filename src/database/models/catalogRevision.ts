import mongoose, { Schema } from "mongoose";

export const CATALOG_MODERATION_STATUSES = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const;
export type CatalogModerationStatus = typeof CATALOG_MODERATION_STATUSES[number];

const CatalogRevisionSchema = new Schema({
  entityType: {
    type: String,
    enum: ["category", "subCategory", "product", "productVariant", "variantRate"],
    required: true,
    index: true,
  },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  proposedChanges: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: CATALOG_MODERATION_STATUSES, default: "DRAFT", index: true },
  createdByAssociate: { type: Schema.Types.ObjectId, ref: "Associate", required: true, index: true },
  createdByCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  approvalRequestedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  reviewNotes: { type: String, default: "", trim: true },
  baseUpdatedAt: { type: Date, required: true },
}, { timestamps: true });

CatalogRevisionSchema.index(
  { entityType: 1, entityId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["DRAFT", "PENDING_REVIEW"] } } },
);

export const CatalogRevisionModel = mongoose.model("CatalogRevision", CatalogRevisionSchema);

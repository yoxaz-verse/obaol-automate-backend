import mongoose, { Schema } from "mongoose";

const CatalogModerationAuditSchema = new Schema({
  entityType: { type: String, enum: ["category", "subCategory", "product", "productVariant"], required: true, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  action: { type: String, enum: ["ADMIN_EDIT", "APPROVE", "REJECT", "DELETE"], required: true, index: true },
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
  notes: { type: String, default: "", trim: true },
  actorId: { type: Schema.Types.ObjectId, required: true, index: true },
  actorRole: { type: String, enum: ["Admin", "Associate"], required: true },
}, { timestamps: true });

CatalogModerationAuditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const CatalogModerationAuditModel = mongoose.model("CatalogModerationAudit", CatalogModerationAuditSchema);

import { Schema } from "mongoose";
import { CATALOG_MODERATION_STATUSES } from "../catalogRevision";

export const addCatalogModerationFields = (schema: Schema) => {
  schema.add({
    approvalStatus: { type: String, enum: CATALOG_MODERATION_STATUSES, default: "APPROVED", index: true },
    createdByAssociate: { type: Schema.Types.ObjectId, ref: "Associate", default: null, index: true },
    createdByCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
    approvalRequestedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    reviewNotes: { type: String, default: "", trim: true },
  });
};

import mongoose, { Schema } from "mongoose";

const DataIntegrityAuditSchema = new Schema({
  auditId: { type: String, required: true, unique: true, index: true },
  operation: { type: String, required: true, enum: ["ORPHAN_CLEANUP", "PERMANENT_ASSOCIATE_DELETE", "PERMANENT_COMPANY_DELETE"] },
  actorId: { type: String, required: true },
  targetId: { type: String, default: null },
  targetLabel: { type: String, default: null },
  deleted: { type: Schema.Types.Mixed, default: {} },
  unlinked: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const DataIntegrityAuditModel = mongoose.model("DataIntegrityAudit", DataIntegrityAuditSchema);

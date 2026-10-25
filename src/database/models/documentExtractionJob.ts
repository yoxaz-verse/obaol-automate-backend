import mongoose, { Schema } from "mongoose";

const ExtractedFieldSchema = new Schema({
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed, default: null },
  confidence: { type: Number, default: 0 },
  page: { type: Number, default: null },
  sourceText: { type: String, default: "" },
}, { _id: false });

const DocumentExtractionJobSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: "TradeDocument", required: true, index: true },
  ownerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["QUEUED", "PROCESSING", "REVIEW_REQUIRED", "COMPLETED", "FAILED"], default: "QUEUED", index: true },
  documentType: { type: String, required: true },
  filePath: { type: String, required: true, select: false },
  mimeType: { type: String, required: true },
  rawText: { type: String, default: "", select: false },
  extractedFields: { type: [ExtractedFieldSchema], default: [] },
  warnings: { type: [String], default: [] },
  error: { type: String, default: "" },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

DocumentExtractionJobSchema.index({ requestedBy: 1, createdAt: -1 });
export const DocumentExtractionJobModel = mongoose.model("DocumentExtractionJob", DocumentExtractionJobSchema);

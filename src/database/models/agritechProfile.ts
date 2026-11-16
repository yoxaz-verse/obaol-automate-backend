import mongoose, { Schema } from "mongoose";

export const AGRITECH_WORKFLOW_STAGES = ["SOURCING", "PREPARATION", "QUALITY_TESTING", "TRACEABILITY", "LOGISTICS", "FINANCE", "TRADE_EXECUTION", "OTHER"] as const;
export const AGRITECH_PROFILE_STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"] as const;

const LocationSchema = new Schema({
  address: { type: String, required: true, trim: true },
  city: { type: String, default: "", trim: true },
  state: { type: String, default: "", trim: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  point: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], required: true } },
}, { _id: false });

const SnapshotSchema = new Schema({
  displayName: { type: String, required: true, trim: true },
  website: { type: String, required: true, trim: true },
  shortDescription: { type: String, required: true, trim: true, maxlength: 300 },
  companyDescription: { type: String, required: true, trim: true, maxlength: 3000 },
  workflowStages: [{ type: String, enum: AGRITECH_WORKFLOW_STAGES }],
  otherProblem: { type: String, default: "", trim: true, maxlength: 500 },
  hasApi: { type: Boolean, required: true },
  apiDocumentationUrl: { type: String, default: "", trim: true },
  apiSummary: { type: String, default: "", trim: true, maxlength: 1000 },
  coverageMode: { type: String, enum: ["ALL_INDIA", "SELECTED_STATES"], required: true },
  coverageStates: [{ type: String, trim: true }],
  contactEmail: { type: String, required: true, trim: true, lowercase: true },
  contactPhone: { type: String, required: true, trim: true },
  whatsappPhone: { type: String, default: "", trim: true },
  headquarters: { type: LocationSchema, required: true },
}, { _id: false });

const AgritechProfileSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
  draft: { type: SnapshotSchema, default: null },
  published: { type: SnapshotSchema, default: null },
  status: { type: String, enum: AGRITECH_PROFILE_STATUSES, default: "DRAFT", index: true },
  revision: { type: Number, default: 1, min: 1 },
  reviewNotes: { type: String, default: "", trim: true },
  submittedAt: Date,
  publishedAt: Date,
  reviewedBy: { type: Schema.Types.ObjectId, default: null },
  archivedAt: Date,
  statusHistory: [{ status: { type: String, enum: AGRITECH_PROFILE_STATUSES }, at: { type: Date, default: Date.now }, actorId: Schema.Types.ObjectId, note: { type: String, default: "" } }],
}, { timestamps: true });

AgritechProfileSchema.index({ status: 1, "published.displayName": 1 });
AgritechProfileSchema.index({ "published.workflowStages": 1, "published.hasApi": 1, "published.coverageStates": 1 });
AgritechProfileSchema.index({ "published.headquarters.point": "2dsphere" }, { sparse: true });
AgritechProfileSchema.index({ "published.displayName": "text", "published.shortDescription": "text", "published.companyDescription": "text" });

export const AgritechProfileModel = mongoose.model("AgritechProfile", AgritechProfileSchema);

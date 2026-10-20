import mongoose, { Schema } from "mongoose";

export const LAB_CUSTODY_STATUSES = ["EXPECTED", "RECEIVED", "TESTING", "COMPLETED", "RELEASED"] as const;

const StatusEventSchema = new Schema({
  status: { type: String, enum: LAB_CUSTODY_STATUSES, required: true },
  at: { type: Date, required: true, default: Date.now },
  by: { type: Schema.Types.ObjectId, required: true },
  note: { type: String, default: "", trim: true, maxlength: 1000 },
}, { _id: false });

const LabWorkItemSchema = new Schema({
  inquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", required: true, index: true },
  executionTaskId: { type: Schema.Types.ObjectId, required: true },
  labCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  labProfileId: { type: Schema.Types.ObjectId, ref: "LabProfile", default: null, index: true },
  status: { type: String, enum: LAB_CUSTODY_STATUSES, default: "EXPECTED", index: true },
  notes: { type: String, default: "", trim: true, maxlength: 2000 },
  expectedAt: { type: Date, default: Date.now },
  receivedAt: { type: Date, default: null },
  testingAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  releasedAt: { type: Date, default: null },
  statusHistory: { type: [StatusEventSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  updatedBy: { type: Schema.Types.ObjectId, required: true },
}, { timestamps: true });

LabWorkItemSchema.index({ inquiryId: 1, executionTaskId: 1 }, { unique: true });
LabWorkItemSchema.index({ labCompanyId: 1, status: 1, updatedAt: -1 });

export const LabWorkItemModel = mongoose.model("LabWorkItem", LabWorkItemSchema);

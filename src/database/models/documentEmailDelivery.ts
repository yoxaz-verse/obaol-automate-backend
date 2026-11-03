import mongoose, { Schema } from "mongoose";

const DocumentEmailDeliverySchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  documentId: { type: Schema.Types.ObjectId, ref: "TradeDocument", required: true, index: true },
  documentRevision: { type: Number, default: 1 },
  provider: { type: String, enum: ["GOOGLE", "MICROSOFT"], required: true },
  sender: { type: String, required: true },
  recipient: { type: String, required: true },
  cc: { type: [String], default: [] },
  subject: { type: String, required: true },
  status: { type: String, enum: ["QUEUED", "SENDING", "SENT", "FAILED"], default: "QUEUED", index: true },
  providerMessageId: { type: String, default: "" },
  failureCode: { type: String, default: "" },
  failureMessage: { type: String, default: "" },
  idempotencyKey: { type: String, required: true },
  initiatedBy: { type: Schema.Types.ObjectId, default: null },
  sentAt: { type: Date, default: null },
}, { timestamps: true });

DocumentEmailDeliverySchema.index({ companyId: 1, documentId: 1, idempotencyKey: 1 }, { unique: true });
DocumentEmailDeliverySchema.index({ documentId: 1, createdAt: -1 });
export const DocumentEmailDeliveryModel = mongoose.model("DocumentEmailDelivery", DocumentEmailDeliverySchema);

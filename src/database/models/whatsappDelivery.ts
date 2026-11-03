import mongoose, { Schema } from "mongoose";
const WhatsappDeliverySchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  documentId: { type: Schema.Types.ObjectId, ref: "TradeDocument", default: null, index: true },
  invitationId: { type: Schema.Types.ObjectId, ref: "AssociateReferralInvitation", default: null, index: true },
  documentRevision: { type: Number, default: null }, recipient: { type: String, required: true }, sender: { type: String, required: true },
  templateName: { type: String, required: true }, templateLanguage: { type: String, required: true }, mediaId: { type: String, default: "" },
  metaMessageId: { type: String, default: "", index: true }, idempotencyKey: { type: String, required: true },
  status: { type: String, enum: ["QUEUED", "SENDING", "SENT", "DELIVERED", "READ", "FAILED"], default: "QUEUED", index: true },
  failureCode: { type: String, default: "" }, failureMessage: { type: String, default: "" }, initiatedBy: { type: Schema.Types.ObjectId, default: null },
  sentAt: { type: Date, default: null }, deliveredAt: { type: Date, default: null }, readAt: { type: Date, default: null }, failedAt: { type: Date, default: null },
}, { timestamps: true });
WhatsappDeliverySchema.index({ companyId: 1, idempotencyKey: 1 }, { unique: true });
WhatsappDeliverySchema.index({ documentId: 1, createdAt: -1 });
export const WhatsappDeliveryModel = mongoose.model("WhatsappDelivery", WhatsappDeliverySchema);

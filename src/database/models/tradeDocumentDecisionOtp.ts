import mongoose, { Schema } from "mongoose";

const TradeDocumentDecisionOtpSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: "TradeDocument", required: true, index: true },
  invitationHash: { type: String, required: true, index: true },
  recipientEmail: { type: String, required: true },
  otpHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  resendAvailableAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  verifiedAt: { type: Date, default: null },
  decisionTokenHash: { type: String, default: null, select: false },
  decisionTokenExpiresAt: { type: Date, default: null },
  usedAt: { type: Date, default: null },
}, { timestamps: true });

TradeDocumentDecisionOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
TradeDocumentDecisionOtpSchema.index({ documentId: 1, invitationHash: 1, createdAt: -1 });

export const TradeDocumentDecisionOtpModel = mongoose.model("TradeDocumentDecisionOtp", TradeDocumentDecisionOtpSchema);


import mongoose, { Schema } from "mongoose";

const AssociateReferralInvitationSchema = new Schema(
  {
    referrerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
    recipientName: { type: String, required: true, trim: true, maxlength: 160 },
    channel: { type: String, enum: ["EMAIL", "WHATSAPP", "LINK"], required: true, index: true },
    destination: { type: String, trim: true, default: "", maxlength: 320 },
    tokenHash: { type: String, required: true, unique: true, select: false },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 100 },
    emailDeliveryStatus: { type: String, enum: ["PENDING", "SENDING", "SENT", "FAILED"], default: "PENDING", index: true },
    emailMessageId: { type: String, trim: true, default: "", maxlength: 500 },
    emailAttemptedAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null },
    emailFailedAt: { type: Date, default: null },
    emailFailureCode: { type: String, trim: true, default: "", maxlength: 100 },
    emailFailureMessage: { type: String, trim: true, default: "", maxlength: 300 },
    joinedCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
    joinedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AssociateReferralInvitationSchema.index({ referrerCompanyId: 1, idempotencyKey: 1 }, { unique: true });
AssociateReferralInvitationSchema.index({ referrerCompanyId: 1, createdAt: -1 });

export const AssociateReferralInvitationModel = mongoose.model(
  "AssociateReferralInvitation",
  AssociateReferralInvitationSchema
);

import mongoose, { Schema } from "mongoose";

export type SupportConversationStatus = "WAITING" | "ACTIVE" | "RESOLVED";

const supportConversationSchema = new Schema(
  {
    requesterId: { type: Schema.Types.ObjectId, required: true },
    requesterRole: { type: String, required: true, trim: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ["WAITING", "ACTIVE", "RESOLVED"], default: "WAITING", index: true },
    isOpen: { type: Boolean, default: true, index: true },
    assignedAgent: { type: Schema.Types.ObjectId, ref: "CustomerSupportAgent", default: null, index: true },
    claimedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, default: null },
    reopenUntil: { type: Date, default: null },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: "", maxlength: 240 },
  },
  { timestamps: true }
);

supportConversationSchema.index({ status: 1, createdAt: 1 });
supportConversationSchema.index({ assignedAgent: 1, status: 1, lastMessageAt: -1 });
supportConversationSchema.index({ requesterId: 1 }, { unique: true, partialFilterExpression: { isOpen: true } });

export const SupportConversationModel = mongoose.model("SupportConversation", supportConversationSchema);

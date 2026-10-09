import mongoose, { Schema } from "mongoose";

const supportMessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "SupportConversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    senderRole: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

supportMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const SupportMessageModel = mongoose.model("SupportMessage", supportMessageSchema);

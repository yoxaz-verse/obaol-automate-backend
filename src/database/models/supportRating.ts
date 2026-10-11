import mongoose, { Schema } from "mongoose";

const supportRatingSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "SupportConversation", required: true, unique: true, index: true },
    ratedAgentId: { type: Schema.Types.ObjectId, ref: "CustomerSupportAgent", required: true, index: true },
    requesterId: { type: Schema.Types.ObjectId, required: true, index: true },
    requesterRole: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 1, max: 5, index: true },
    comment: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

supportRatingSchema.index({ ratedAgentId: 1, createdAt: -1 });

export const SupportRatingModel = mongoose.model("SupportRating", supportRatingSchema);

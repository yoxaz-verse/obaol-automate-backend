import mongoose from "mongoose";

const authChallengeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, required: true, index: true },
    purpose: {
      type: String,
      enum: ["PASSKEY_REGISTRATION", "PASSKEY_AUTHENTICATION"],
      required: true,
      index: true,
    },
    challenge: { type: String, required: true },
    webAuthnUserId: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

authChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });
authChallengeSchema.index({ userId: 1, role: 1, purpose: 1, consumedAt: 1, createdAt: -1 });

export const AuthChallengeModel = mongoose.model("AuthChallenge", authChallengeSchema);

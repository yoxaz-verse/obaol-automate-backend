import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, required: true, index: true },
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    location: { type: String, default: "Unknown" },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

authSessionSchema.index({ userId: 1, role: 1, revokedAt: 1, expiresAt: -1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthSessionModel = mongoose.model("AuthSession", authSessionSchema);

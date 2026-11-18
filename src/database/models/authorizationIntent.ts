import mongoose from "mongoose";

const authorizationIntentSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  actorRole: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  action: { type: String, required: true, index: true },
  payloadHash: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  status: { type: String, enum: ["PENDING", "VERIFIED", "CONSUMED", "EXPIRED", "FAILED"], default: "PENDING", index: true },
  authenticationMethod: { type: String, enum: ["PASSKEY", "EMAIL_OTP", null], default: null },
  challenge: { type: String, default: "", select: false },
  otpDigest: { type: String, default: "", select: false },
  otpAttempts: { type: Number, default: 0, select: false },
  otpSentAt: { type: Date, default: null },
  verifiedAt: { type: Date, default: null },
  consumedAt: { type: Date, default: null },
  idempotencyKey: { type: String, default: null },
  expiresAt: { type: Date, required: true },
  audit: { type: [{ event: String, at: { type: Date, default: Date.now }, metadata: mongoose.Schema.Types.Mixed }], default: [] },
}, { timestamps: true });

authorizationIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });
authorizationIntentSchema.index({ actorId: 1, status: 1, createdAt: -1 });
authorizationIntentSchema.index({ actorId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });

export const AuthorizationIntentModel = mongoose.model("AuthorizationIntent", authorizationIntentSchema);

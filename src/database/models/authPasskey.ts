import mongoose from "mongoose";

export type AuthRole =
  | "Admin"
  | "ProjectManager"
  | "InventoryManager"
  | "Operator"
  | "Associate";

const authPasskeySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    role: {
      type: String,
      required: true,
      enum: ["Admin", "ProjectManager", "InventoryManager", "Operator", "Associate"],
      index: true,
    },
    credentialId: { type: String, required: true, unique: true },
    webAuthnUserId: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    transports: [{ type: String }],
    deviceType: { type: String, default: "" },
    backedUp: { type: Boolean, default: false },
    deviceLabel: { type: String, default: "Passkey" },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

authPasskeySchema.index({ userId: 1, role: 1, revokedAt: 1 });
authPasskeySchema.index({ webAuthnUserId: 1, userId: 1, role: 1 });

export const AuthPasskeyModel = mongoose.model("AuthPasskey", authPasskeySchema);

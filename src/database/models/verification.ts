// models/Verification.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IVerification extends Document {
  userId: string; // _id from user model
  userType:
  | "Associate"
  | "InventoryManager"
  | "CustomerSupport"
  | "Admin"
  | "ProjectManager"
  | "Operator"; // extend as needed
  method: "email" | "phone" | "whatsapp";
  code?: string;
  codeDigest?: string;
  destination?: string;
  metaMessageId?: string;
  deliveryStatus?: string;
  deliveryFailureCode?: string;
  deliveryFailureMessage?: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  verified: Boolean;
}

const VerificationSchema = new Schema<IVerification>(
  {
    userId: { type: String, required: true }, // use ObjectId if needed, but keep it generic
    userType: {
      type: String,
      required: true,
      enum: ["Associate", "InventoryManager", "CustomerSupport", "Admin", "ProjectManager", "Operator"],
    },
    method: { type: String, enum: ["email", "phone", "whatsapp"], required: true },
    code: { type: String, default: undefined, select: false },
    codeDigest: { type: String, default: undefined, select: false },
    destination: { type: String, default: "", select: false },
    metaMessageId: { type: String, default: "", index: true },
    deliveryStatus: { type: String, enum: ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED", ""], default: "" },
    deliveryFailureCode: { type: String, default: "" },
    deliveryFailureMessage: { type: String, default: "", select: false },
    expiresAt: { type: Date, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });
VerificationSchema.index({ userId: 1, userType: 1, method: 1, verified: 1, createdAt: -1 });

export const VerificationModel = mongoose.model(
  "Verification",
  VerificationSchema
);

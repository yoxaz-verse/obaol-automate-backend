// models/Verification.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IVerification extends Document {
  userId: string; // _id from user model
  userType:
  | "Associate"
  | "InventoryManager"
  | "Admin"
  | "Operator"; // extend as needed
  method: "email" | "phone";
  code: string;
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
      enum: ["Associate", "InventoryManager", "Admin", "Operator"],
    },
    method: { type: String, enum: ["email", "phone"], required: true },
    code: { type: String, required: true },
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

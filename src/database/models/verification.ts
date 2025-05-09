// models/Verification.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IVerification extends Document {
  userId: string; // _id from user model
  userType: "Associate" | "Customer" | "InventoryManager" | "Admin"; // extend as needed
  method: "email" | "phone";
  code: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  verified: Boolean;
}

const VerificationSchema = new Schema<IVerification>({
  userId: { type: String, required: true }, // use ObjectId if needed, but keep it generic
  userType: {
    type: String,
    required: true,
    enum: ["Associate", "Customer", "InventoryManager", "Admin"],
  },
  method: { type: String, enum: ["email", "phone"], required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  verified: { type: Boolean, default: false }, // <-- New field
});

export const VerificationModel = mongoose.model(
  "Verification",
  VerificationSchema
);

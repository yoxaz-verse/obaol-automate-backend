import mongoose from "mongoose";
import { passwordPlugin } from "./plugins/password.plugin";

interface IAdmin extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  role: string;
  failedLoginAttempts?: number;
  loginLockedUntil?: Date | null;
  lastFailedLoginAt?: Date | null;
  loginLockoutLevel?: number;
  lastSeenAt?: Date | null;
  lastLoginAt?: Date | null;
  presenceUpdatedAt?: Date | null;
  presenceSource?: "AUTH_REQUEST" | "HEARTBEAT" | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    role: { type: String, default: "admin" },
    failedLoginAttempts: { type: Number, default: 0 },
    loginLockedUntil: { type: Date, default: null },
    lastFailedLoginAt: { type: Date, default: null },
    loginLockoutLevel: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: null, index: true },
    lastLoginAt: { type: Date, default: null, index: true },
    presenceUpdatedAt: { type: Date, default: null },
    presenceSource: { type: String, enum: ["AUTH_REQUEST", "HEARTBEAT", null], default: null },
  },
  {
    timestamps: true,
  }
);

adminSchema.plugin(passwordPlugin);

export const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);

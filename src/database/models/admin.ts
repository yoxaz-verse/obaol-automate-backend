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
  },
  {
    timestamps: true,
  }
);

adminSchema.plugin(passwordPlugin);

export const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);

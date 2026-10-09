import mongoose from "mongoose";

export interface ICustomerSupportAgent {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  admin: mongoose.Types.ObjectId;
  role: "CustomerSupport";
  isActive: boolean;
  isDeleted: boolean;
  isAvailable: boolean;
  activeChatCount: number;
  availabilityUpdatedAt?: Date | null;
  failedLoginAttempts?: number;
  loginLockedUntil?: Date | null;
  lastFailedLoginAt?: Date | null;
  loginLockoutLevel?: number;
  lastSeenAt?: Date | null;
  lastLoginAt?: Date | null;
  presenceUpdatedAt?: Date | null;
  presenceSource?: "AUTH_REQUEST" | "HEARTBEAT" | null;
}

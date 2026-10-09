import mongoose from "mongoose";
import { ICustomerSupportAgent } from "../../interfaces/customerSupportAgent";
import { passwordPlugin } from "./plugins/password.plugin";

interface CustomerSupportAgentDocument extends Omit<ICustomerSupportAgent, "_id">, mongoose.Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const customerSupportAgentSchema = new mongoose.Schema<CustomerSupportAgentDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    password: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    role: { type: String, enum: ["CustomerSupport"], default: "CustomerSupport" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false, index: true },
    activeChatCount: { type: Number, default: 0, min: 0 },
    availabilityUpdatedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    loginLockedUntil: { type: Date, default: null },
    lastFailedLoginAt: { type: Date, default: null },
    loginLockoutLevel: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: null, index: true },
    lastLoginAt: { type: Date, default: null, index: true },
    presenceUpdatedAt: { type: Date, default: null },
    presenceSource: { type: String, enum: ["AUTH_REQUEST", "HEARTBEAT", null], default: null },
  },
  { timestamps: true }
);

customerSupportAgentSchema.plugin(passwordPlugin);

export const CustomerSupportAgentModel = mongoose.model<CustomerSupportAgentDocument>(
  "CustomerSupportAgent",
  customerSupportAgentSchema
);

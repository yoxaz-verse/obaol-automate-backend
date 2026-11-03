import mongoose, { Schema } from "mongoose";

const CompanyMailConnectionSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
  provider: { type: String, enum: ["GOOGLE", "MICROSOFT"], required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  encryptedCredentials: { type: String, required: true, select: false },
  scopes: { type: [String], default: [] },
  status: { type: String, enum: ["CONNECTED", "RECONNECT_REQUIRED", "DISCONNECTED"], default: "CONNECTED", index: true },
  tokenExpiresAt: { type: Date, default: null },
  lastSuccessfulUseAt: { type: Date, default: null },
  lastErrorAt: { type: Date, default: null },
  lastErrorCode: { type: String, default: "" },
  connectedBy: { type: Schema.Types.ObjectId, default: null },
  disconnectedAt: { type: Date, default: null },
}, { timestamps: true });

export const CompanyMailConnectionModel = mongoose.model("CompanyMailConnection", CompanyMailConnectionSchema);

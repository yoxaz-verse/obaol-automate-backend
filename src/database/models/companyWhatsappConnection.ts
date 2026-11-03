import mongoose, { Schema } from "mongoose";
const CompanyWhatsappConnectionSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
  wabaId: { type: String, required: true }, phoneNumberId: { type: String, required: true, unique: true, index: true },
  displayPhoneNumber: { type: String, required: true }, verifiedName: { type: String, default: "" },
  encryptedAccessToken: { type: String, required: true, select: false },
  status: { type: String, enum: ["CONNECTED", "RECONNECT_REQUIRED", "DISCONNECTED"], default: "CONNECTED", index: true },
  connectedBy: { type: Schema.Types.ObjectId, default: null }, lastSuccessfulUseAt: { type: Date, default: null },
  lastWebhookAt: { type: Date, default: null }, lastErrorAt: { type: Date, default: null }, lastErrorCode: { type: String, default: "" }, disconnectedAt: { type: Date, default: null },
}, { timestamps: true });
export const CompanyWhatsappConnectionModel = mongoose.model("CompanyWhatsappConnection", CompanyWhatsappConnectionSchema);

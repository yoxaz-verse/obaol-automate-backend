import mongoose from "mongoose";

const signatureSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ["USER", "COMPANY"], required: true, index: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  ownerRole: { type: String, default: "" },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
  signerName: { type: String, required: true, trim: true, maxlength: 150 },
  signerDesignation: { type: String, default: "", trim: true, maxlength: 150 },
  status: { type: String, enum: ["PENDING_VERIFICATION", "ACTIVE", "REVOKED"], default: "PENDING_VERIFICATION", index: true },
  version: { type: Number, required: true, min: 1 },
  objectKey: { type: String, required: true, select: false },
  checksum: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, default: "image/png" },
  originalFileName: { type: String, default: "signature.png" },
  registeredAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date, default: null },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  verificationMethod: { type: String, enum: ["PASSKEY", "EMAIL_OTP", null], default: null },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  legacyCompanySignature: { type: Boolean, default: false },
}, { timestamps: true });

signatureSchema.index({ ownerType: 1, ownerUserId: 1, version: -1 });
signatureSchema.index({ ownerType: 1, companyId: 1, version: -1 });
signatureSchema.index({ ownerType: 1, ownerUserId: 1, status: 1 });
signatureSchema.index({ ownerType: 1, companyId: 1, status: 1 });

export const SignatureModel = mongoose.model("Signature", signatureSchema);

import mongoose, { Schema } from "mongoose";
import { EWAY_BILL_STATUSES, EWAY_CONNECTION_STATUSES } from "../../interfaces/freightForwarding";

const audit = new Schema({ action: String, at: { type: Date, default: Date.now }, by: Schema.Types.ObjectId, detail: Schema.Types.Mixed }, { _id: true });

const EWayBillConnectionSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
  provider: { type: String, required: true, trim: true }, gstin: { type: String, required: true, uppercase: true, trim: true },
  environment: { type: String, enum: ["SANDBOX", "PRODUCTION"], default: "SANDBOX" },
  encryptedCredentials: { type: String, required: true, select: false },
  status: { type: String, enum: EWAY_CONNECTION_STATUSES, default: "CONNECTED", index: true },
  connectedBy: Schema.Types.ObjectId, lastTestedAt: Date, lastSuccessfulUseAt: Date, lastErrorAt: Date, lastErrorCode: String, disconnectedAt: Date,
}, { timestamps: true });

const EWayBillSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  shipment: { type: Schema.Types.ObjectId, ref: "FreightShipment", required: true, index: true },
  invoice: { type: Schema.Types.ObjectId, ref: "FreightFinance", default: null, index: true },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, enum: EWAY_BILL_STATUSES, default: "DRAFT", index: true }, rawProviderStatus: String,
  draft: { type: Schema.Types.Mixed, required: true }, submittedSnapshot: { type: Schema.Types.Mixed, default: null },
  validationErrors: { type: [Schema.Types.Mixed], default: [] }, provider: String, providerReference: String,
  ewayBillNumber: { type: String, sparse: true, index: true }, generatedAt: Date, validUntil: Date,
  currentVehicle: Schema.Types.Mixed, currentTransporter: Schema.Types.Mixed,
  transportHistory: { type: [Schema.Types.Mixed], default: [] }, artifacts: { type: Schema.Types.Mixed, default: {} },
  providerMetadata: { type: Schema.Types.Mixed, default: {} }, lastError: Schema.Types.Mixed,
  idempotencyKey: String, submissionLockUntil: Date, lastSyncedAt: Date, nextSyncAt: Date,
  audit: { type: [audit], default: [] }, archivedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });
EWayBillSchema.index({ companyId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
EWayBillSchema.index({ companyId: 1, ewayBillNumber: 1 }, { unique: true, sparse: true });

export const EWayBillConnectionModel = mongoose.model("EWayBillConnection", EWayBillConnectionSchema);
export const EWayBillModel = mongoose.model("EWayBill", EWayBillSchema);

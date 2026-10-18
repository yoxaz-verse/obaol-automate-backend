import mongoose, { Schema } from "mongoose";
import { SERVICE_DEPARTMENTS, SERVICE_WORK_STATUSES } from "../../interfaces/serviceMarketplace";
const HistorySchema = new Schema({ status: String, at: { type: Date, default: Date.now }, by: Schema.Types.ObjectId, note: String }, { _id: false });
const DocumentSchema = new Schema({ kind: { type: String, enum: ["PHOTO", "PACKING_LIST", "LABEL", "COMPLIANCE", "OTHER"] }, name: String, url: String, uploadedBy: Schema.Types.ObjectId, uploadedAt: { type: Date, default: Date.now } }, { _id: true });
const ServiceWorkOrderSchema = new Schema({
  department: { type: String, enum: SERVICE_DEPARTMENTS, required: true, index: true }, requirement: { type: Schema.Types.ObjectId, ref: "ServiceRequirement", required: true, unique: true }, offer: { type: Schema.Types.ObjectId, ref: "ServiceOffer", required: true },
  requester: { type: Schema.Types.ObjectId, ref: "Associate", required: true }, requesterCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, provider: { type: Schema.Types.ObjectId, ref: "Associate", required: true }, providerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  agreedPrice: Number, pricingBasis: String, snapshot: { type: Schema.Types.Mixed, required: true }, enquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null }, orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null }, executionTaskId: { type: Schema.Types.ObjectId, default: null },
  status: { type: String, enum: SERVICE_WORK_STATUSES, default: "AWARDED", index: true }, progressNote: { type: String, default: "", trim: true }, exceptionNote: { type: String, default: "", trim: true }, statusHistory: { type: [HistorySchema], default: [] }, documents: { type: [DocumentSchema], default: [] },
}, { timestamps: true });
ServiceWorkOrderSchema.index({ department: 1, providerCompany: 1, status: 1, updatedAt: -1 });
ServiceWorkOrderSchema.index({ department: 1, requesterCompany: 1, status: 1, updatedAt: -1 });
export const ServiceWorkOrderModel = mongoose.model("ServiceWorkOrder", ServiceWorkOrderSchema);

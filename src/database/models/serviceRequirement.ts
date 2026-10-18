import mongoose, { Schema } from "mongoose";
import { SERVICE_DEPARTMENTS, SERVICE_REQUIREMENT_STATUSES } from "../../interfaces/serviceMarketplace";

const ServiceRequirementSchema = new Schema({
  department: { type: String, enum: SERVICE_DEPARTMENTS, required: true, index: true }, requester: { type: Schema.Types.ObjectId, ref: "Associate", required: true },
  requesterCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, title: { type: String, required: true, trim: true },
  commodityId: { type: Schema.Types.ObjectId, ref: "ServiceTaxonomy", required: true, index: true }, quantity: { type: Number, required: true, min: 0.000001 }, unit: { type: String, enum: ["KG", "MT", "Quintal", "UNIT"], required: true },
  serviceIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }], formatIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }], materialIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }],
  dimensionsOrWeight: { type: String, default: "", trim: true }, labelingRequirements: { type: String, default: "", trim: true }, qualityRequirements: { type: String, default: "", trim: true },
  originLocation: { type: String, default: "", trim: true }, deliveryLocation: { type: String, default: "", trim: true }, requiredBy: Date, attachmentUrls: [{ type: String, trim: true }],
  enquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null, index: true }, orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true }, executionTaskId: { type: Schema.Types.ObjectId, default: null },
  opensAt: Date, closesAt: Date, status: { type: String, enum: SERVICE_REQUIREMENT_STATUSES, default: "DRAFT", index: true }, winningOffer: { type: Schema.Types.ObjectId, ref: "ServiceOffer", default: null }, workOrder: { type: Schema.Types.ObjectId, ref: "ServiceWorkOrder", default: null },
  cancellationReason: { type: String, default: "", trim: true }, lifecycleNotices: { openedAt: Date, closingSoonAt: Date, closedAt: Date },
}, { timestamps: true });
ServiceRequirementSchema.index({ department: 1, requesterCompany: 1, status: 1, createdAt: -1 });
ServiceRequirementSchema.index({ department: 1, status: 1, opensAt: 1, closesAt: 1 });
export const ServiceRequirementModel = mongoose.model("ServiceRequirement", ServiceRequirementSchema);

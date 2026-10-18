import mongoose, { Schema } from "mongoose";
import { SERVICE_OFFER_STATUSES } from "../../interfaces/serviceMarketplace";
const RevisionSchema = new Schema({ price: Number, pricingBasis: String, capacityCommitted: Number, turnaroundDays: Number, validUntil: Date, proposedMaterialId: Schema.Types.ObjectId, proposedFormatId: Schema.Types.ObjectId, note: String, attachmentUrls: [String], at: Date, by: Schema.Types.ObjectId }, { _id: false });
const ServiceOfferSchema = new Schema({
  requirement: { type: Schema.Types.ObjectId, ref: "ServiceRequirement", required: true, index: true }, provider: { type: Schema.Types.ObjectId, ref: "Associate", required: true }, providerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  price: { type: Number, required: true, min: 0.000001 }, pricingBasis: { type: String, required: true, trim: true }, capacityCommitted: { type: Number, required: true, min: 0.000001 }, turnaroundDays: { type: Number, required: true, min: 0 },
  validUntil: Date, proposedMaterialId: { type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }, proposedFormatId: { type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }, note: { type: String, default: "", trim: true }, attachmentUrls: [{ type: String, trim: true }],
  status: { type: String, enum: SERVICE_OFFER_STATUSES, default: "SUBMITTED", index: true }, revisions: { type: [RevisionSchema], default: [] },
}, { timestamps: true });
ServiceOfferSchema.index({ requirement: 1, providerCompany: 1 }, { unique: true });
export const ServiceOfferModel = mongoose.model("ServiceOffer", ServiceOfferSchema);

import mongoose, { Schema } from "mongoose";
import { ISampleRequest } from "../../interfaces/sampleRequest";

const SampleRequestSchema: Schema = new Schema(
  {
    variantRateId: { type: Schema.Types.ObjectId, ref: "VariantRate", required: true, index: true },
    productVariant: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true, index: true },
    supplierCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
    buyerAssociateId: { type: Schema.Types.ObjectId, ref: "Associate", required: true, index: true },
    requestState: { type: Schema.Types.ObjectId, ref: "State", required: true },
    requestDistrict: { type: Schema.Types.ObjectId, ref: "District", required: true },
    requestCity: { type: Schema.Types.ObjectId, ref: "City", required: true },
    requestAddress: { type: String, required: true, trim: true },
    requestPincode: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["REQUESTED", "QUOTED", "ACCEPTED", "REJECTED", "CANCELLED"],
      default: "REQUESTED",
      index: true,
    },
    requestedAt: { type: Date, default: Date.now, index: true },
    quotedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    supplierMinQty: { type: Number, default: null },
    supplierPrice: { type: Number, default: null },
    markupPercent: { type: Number, default: 20 },
    buyerPrice: { type: Number, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

SampleRequestSchema.index({ status: 1, requestedAt: -1 });
SampleRequestSchema.index({ buyerAssociateId: 1, requestedAt: -1 });
SampleRequestSchema.index({ supplierCompanyId: 1, requestedAt: -1 });

export const SampleRequestModel = mongoose.model<ISampleRequest>(
  "SampleRequest",
  SampleRequestSchema
);

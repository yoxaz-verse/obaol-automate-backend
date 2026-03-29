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
    requestDivision: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    requestCity: { type: Schema.Types.ObjectId, ref: "City", required: false },
    requestAddress: { type: String, required: true, trim: true },
    requestPincode: { type: String, required: true, trim: true },
    requestedSampleQtyKg: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "QUOTED",
        "ACCEPTED",
        "PAYMENT_RECEIVED",
        "PREPARING_PACKAGING",
        "PACKAGED",
        "COURIER_SUBMITTED",
        "IN_TRANSIT",
        "RECEIPT_CONFIRMED",
        "REJECTED",
        "CANCELLED",
      ],
      default: "REQUESTED",
      index: true,
    },
    requestedAt: { type: Date, default: Date.now, index: true },
    quotedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    paymentReceivedAt: { type: Date, default: null },
    packagingStartedAt: { type: Date, default: null },
    packagedAt: { type: Date, default: null },
    courierSubmittedAt: { type: Date, default: null },
    courierAgencyName: { type: String, default: null },
    courierTrackingNumber: { type: String, default: null },
    inTransitAt: { type: Date, default: null },
    receiptConfirmedAt: { type: Date, default: null },
    receiptFileId: { type: Schema.Types.ObjectId, ref: "File", default: null },
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

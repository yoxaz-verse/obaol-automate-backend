import { IEnquiry } from "../../interfaces/enquiry";
import mongoose, { Schema } from "mongoose";

const EnquirySchema: Schema = new Schema({
  phoneNumber: { type: String, required: true },
  name: { type: String, required: true },
  variantRate: {
    type: Schema.Types.ObjectId,
    ref: "VariantRate",
    required: true,
  },
  displayRate: {
    type: Schema.Types.ObjectId,
    ref: "DisplayedRate",
    default: null,
  },
  productVariant: {
    type: Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: true,
  },
  mediatorAssociate: {
    type: Schema.Types.ObjectId,
    ref: "Associate",
    default: null,
  },
  productAssociate: {
    type: Schema.Types.ObjectId,
    ref: "Associate",
    required: true,
  },
  status: {
    type: Schema.Types.ObjectId,
    ref: "EnquiryProcessStatus",
  },
  createdAt: { type: Date, default: Date.now },
  rate: { type: Number, required: true },
  commission: { type: Number },
  mediatorCommission: { type: Number },
  
});

export const EnquiryModel = mongoose.model<IEnquiry>("Enquiry", EnquirySchema);

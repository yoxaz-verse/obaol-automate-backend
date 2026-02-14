import mongoose, { Schema } from "mongoose";
import { IEnquiry } from "../../interfaces/enquiry";

const EnquirySchema: Schema = new Schema(
    {
        phoneNumber: { type: String, required: true },
        name: { type: String, required: true },
        email: { type: String },
        specification: { type: String },
        quantity: { type: Number },
        quantityUnit: { type: String },
        variantRate: { type: Schema.Types.ObjectId, ref: "VariantRate", required: true },
        displayRate: { type: Schema.Types.ObjectId, ref: "DisplayedRate" },
        productVariant: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true },
        mediatorAssociate: { type: Schema.Types.ObjectId, ref: "Associate" },
        productAssociate: { type: Schema.Types.ObjectId, ref: "Associate", required: true },
        rate: { type: Number },
        status: { type: String, default: "Pending" },
        associateCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany" },
        commission: { type: Number },
        mediatorCommission: { type: Number },
        order: { type: Schema.Types.ObjectId, ref: "Order" },
    },
    {
        timestamps: true,
    }
);

export const EnquiryModel = mongoose.model<IEnquiry>(
    "Enquiry",
    EnquirySchema
);

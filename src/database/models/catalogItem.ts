import mongoose, { Schema, Document } from "mongoose";

export interface ICatalogItem extends Document {
    associateId: mongoose.Types.ObjectId;
    associateCompanyId: mongoose.Types.ObjectId;
    productVariantId: mongoose.Types.ObjectId;
    baseRateId: mongoose.Types.ObjectId;
    margin: number;
    finalPrice: number;
    isLive: boolean;
    customTitle?: string;
    customDescription?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CatalogItemSchema: Schema = new Schema(
    {
        associateId: {
            type: Schema.Types.ObjectId,
            ref: "Associate",
            required: true,
            index: true,
        },
        associateCompanyId: {
            type: Schema.Types.ObjectId,
            ref: "AssociateCompany",
            required: true,
            index: true,
        },
        productVariantId: {
            type: Schema.Types.ObjectId,
            ref: "ProductVariant",
            required: true,
            index: true,
        },
        baseRateId: {
            type: Schema.Types.ObjectId,
            ref: "VariantRate",
            required: true,
        },
        margin: {
            type: Number,
            default: 0,
            min: 0,
        },
        finalPrice: {
            type: Number,
            required: true,
        },
        isLive: {
            type: Boolean,
            default: true,
        },
        customTitle: {
            type: String,
            trim: true,
        },
        customDescription: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure an associate cannot add the same variant rate twice
CatalogItemSchema.index(
    { associateId: 1, baseRateId: 1 },
    { unique: true }
);

export const CatalogItemModel = mongoose.model<ICatalogItem>(
    "CatalogItem",
    CatalogItemSchema
);

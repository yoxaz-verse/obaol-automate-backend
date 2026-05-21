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
    lastLiveAt?: Date | null;
    lastLiveDate?: Date | null;
    unit?: string;
    listingState?: "DRAFT" | "LIVE";
    activatedAt?: Date | null;
    activatedBy?: mongoose.Types.ObjectId | null;
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
            required: false,
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
        lastLiveAt: { type: Date, default: null },
        lastLiveDate: { type: Date, default: null },
        unit: { type: String, default: 'KG' },
        listingState: {
            type: String,
            enum: ["DRAFT", "LIVE"],
            default: "LIVE",
            index: true,
        },
        activatedAt: { type: Date, default: null },
        activatedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
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

CatalogItemSchema.pre<ICatalogItem>("save", function (next) {
    if (this.isModified("isLive")) {
        // We reuse the logic from TimeCalculations if possible, otherwise we set it manually
        // Since I'm in the backend, I should check if TimeCalculations is available
        if (this.isLive) {
            const now = new Date();
            this.lastLiveAt = now;
            this.lastLiveDate = now;
        }
    }
    next();
});

export const CatalogItemModel = mongoose.model<ICatalogItem>(
    "CatalogItem",
    CatalogItemSchema
);

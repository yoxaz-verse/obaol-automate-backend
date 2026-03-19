import mongoose, { Schema } from "mongoose";
import { IInventory } from "../../interfaces/inventory";

const InventorySchema: Schema = new Schema(
    {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productVariant: {
            type: Schema.Types.ObjectId,
            ref: "ProductVariant",
            required: true,
        },
        associate: { type: Schema.Types.ObjectId, ref: "Associate", required: true },
        associateCompany: {
            type: Schema.Types.ObjectId,
            ref: "AssociateCompany",
            required: false,
        },
        quantity: { type: Number, required: true, default: 0, min: 0 },
        unit: {
            type: String,
            required: true,
            default: "MT",
            enum: ["MT"],
        },
        custodianType: {
            type: String,
            enum: ["WAREHOUSE", null],
            default: null,
            index: true,
        },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", default: null, index: true },
        storedAt: { type: Date, default: null },
        status: {
            type: String,
            enum: ["AVAILABLE", "STORED", "INBOUND_PENDING", "OUTBOUND_PENDING"],
            default: "AVAILABLE",
            index: true,
        },
        warehouseName: { type: String, required: false },
        state: { type: Schema.Types.ObjectId, ref: "State" },
        district: { type: Schema.Types.ObjectId, ref: "District" },
        division: { type: Schema.Types.ObjectId, ref: "Division" },
        pincodeEntry: { type: Schema.Types.ObjectId, ref: "PincodeEntry" },
        linkedVariantRate: { type: Schema.Types.ObjectId, ref: "VariantRate", default: null },
        isDemo: { type: Boolean, default: false, index: true },
        demoTag: { type: String, default: null, index: true },
        demoCreatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
        isDeleted: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

// Optional: Pre-save hook to sync associateCompany if needed, similar to VariantRate
// But let's keep it simple for now as per user request.

export const InventoryModel = mongoose.model<IInventory>(
    "Inventory",
    InventorySchema
);

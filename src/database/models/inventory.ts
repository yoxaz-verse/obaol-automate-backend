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
            default: "KG",
            enum: ["KG", "MT", "Quintal"],
        },
        warehouseName: { type: String, required: false },
        state: { type: Schema.Types.ObjectId, ref: "State" },
        district: { type: Schema.Types.ObjectId, ref: "District" },
        division: { type: Schema.Types.ObjectId, ref: "Division" },
        pincodeEntry: { type: Schema.Types.ObjectId, ref: "PincodeEntry" },
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

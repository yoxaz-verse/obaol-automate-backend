import mongoose, { Schema } from "mongoose";
import { IStorageCharge } from "../../interfaces/storageCharge";

const StorageChargeSchema = new Schema(
    {
        inventoryId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true, index: true },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
        companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
        fromDate: { type: Date, required: true },
        toDate: { type: Date, required: true },
        durationDays: { type: Number, required: true, min: 0 },
        ratePerUnit: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 0 },
        totalCharge: { type: Number, required: true, min: 0 },
        linkedTradeId: { type: Schema.Types.ObjectId, default: null },
        status: { type: String, enum: ["CALCULATED", "BILLED", "PAID"], default: "CALCULATED", index: true },
    },
    { timestamps: true }
);

StorageChargeSchema.index({ warehouseId: 1, fromDate: 1 });

export const StorageChargeModel = mongoose.model<IStorageCharge>(
    "StorageCharge",
    StorageChargeSchema
);

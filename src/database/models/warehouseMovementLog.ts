import mongoose, { Schema } from "mongoose";
import { IWarehouseMovementLog } from "../../interfaces/warehouseMovementLog";

const WarehouseMovementLogSchema = new Schema(
    {
        inventoryId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true, index: true },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
        companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
        type: { type: String, enum: ["INBOUND", "OUTBOUND", "ADJUSTMENT"], required: true, index: true },
        quantity: { type: Number, required: true, min: 0 },
        timestamp: { type: Date, required: true, default: Date.now },
        performedBy: { type: Schema.Types.ObjectId, ref: "Operator", required: true },
        linkedTradeId: { type: Schema.Types.ObjectId, default: null },
        note: { type: String, default: "" },
    },
    { timestamps: true }
);

WarehouseMovementLogSchema.index({ warehouseId: 1, timestamp: -1 });

export const WarehouseMovementLogModel = mongoose.model<IWarehouseMovementLog>(
    "WarehouseMovementLog",
    WarehouseMovementLogSchema
);

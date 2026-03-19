import { Document, Schema } from "mongoose";

export interface IWarehouseMovementLog extends Document {
    inventoryId: Schema.Types.ObjectId;
    warehouseId: Schema.Types.ObjectId;
    companyId: Schema.Types.ObjectId;
    type: "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
    quantity: number;
    timestamp: Date;
    performedBy: Schema.Types.ObjectId;
    linkedTradeId?: Schema.Types.ObjectId | null;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}

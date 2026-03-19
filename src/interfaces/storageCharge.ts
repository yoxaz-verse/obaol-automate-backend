import { Document, Schema } from "mongoose";

export interface IStorageCharge extends Document {
    inventoryId: Schema.Types.ObjectId;
    warehouseId: Schema.Types.ObjectId;
    companyId: Schema.Types.ObjectId;
    fromDate: Date;
    toDate: Date;
    durationDays: number;
    ratePerUnit: number;
    quantity: number;
    totalCharge: number;
    linkedTradeId?: Schema.Types.ObjectId | null;
    status: "CALCULATED" | "BILLED" | "PAID";
    createdAt: Date;
    updatedAt: Date;
}

import { Document, Schema } from "mongoose";

export interface IWarehouseAssignment extends Document {
    warehouseId: Schema.Types.ObjectId;
    companyId: Schema.Types.ObjectId;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}

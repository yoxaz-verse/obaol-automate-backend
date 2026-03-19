import mongoose, { Schema } from "mongoose";
import { IWarehouseAssignment } from "../../interfaces/warehouseAssignment";

const WarehouseAssignmentSchema = new Schema(
    {
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
        companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE", index: true },
    },
    { timestamps: true }
);

WarehouseAssignmentSchema.index({ warehouseId: 1, companyId: 1 }, { unique: true });

export const WarehouseAssignmentModel = mongoose.model<IWarehouseAssignment>(
    "WarehouseAssignment",
    WarehouseAssignmentSchema
);

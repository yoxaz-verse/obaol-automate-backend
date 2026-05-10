import mongoose, { Schema } from "mongoose";
import { IWarehouseAssignment } from "../../interfaces/warehouseAssignment";

const WarehouseAssignmentSchema = new Schema(
    {
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
        companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE", index: true },
        requiredMT: { type: Number, min: 0, default: 0 },
        durationMonths: { type: Number, min: 1, default: 1 },
        requirementNotes: { type: String, default: "" },
        expectedStartDate: { type: Date, default: null },
        estimateBaseAmount: { type: Number, min: 0, default: 0 },
        estimateTaxAmount: { type: Number, min: 0, default: 0 },
        estimateHandlingAmount: { type: Number, min: 0, default: 0 },
        estimateTotalAmount: { type: Number, min: 0, default: 0 },
        estimateCurrency: { type: String, default: "INR" },
        requestType: { type: String, enum: ["QUOTE_REQUEST", "DIRECT_BOOKING"], default: "DIRECT_BOOKING" },
        bookingStatus: { type: String, enum: ["PENDING_QUOTE", "BOOKED", "REJECTED", "CANCELLED"], default: "BOOKED", index: true },
    },
    { timestamps: true }
);

WarehouseAssignmentSchema.index({ warehouseId: 1, companyId: 1 }, { unique: true });

export const WarehouseAssignmentModel = mongoose.model<IWarehouseAssignment>(
    "WarehouseAssignment",
    WarehouseAssignmentSchema
);

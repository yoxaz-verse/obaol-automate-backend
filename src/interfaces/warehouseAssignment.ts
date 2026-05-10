import { Document, Schema } from "mongoose";

export interface IWarehouseAssignment extends Document {
    warehouseId: Schema.Types.ObjectId;
    companyId: Schema.Types.ObjectId;
    status: "ACTIVE" | "INACTIVE";
    requiredMT?: number;
    durationMonths?: number;
    requirementNotes?: string;
    expectedStartDate?: Date | null;
    estimateBaseAmount?: number;
    estimateTaxAmount?: number;
    estimateHandlingAmount?: number;
    estimateTotalAmount?: number;
    estimateCurrency?: string;
    requestType?: "QUOTE_REQUEST" | "DIRECT_BOOKING";
    bookingStatus?: "PENDING_QUOTE" | "BOOKED" | "REJECTED" | "CANCELLED";
    createdAt: Date;
    updatedAt: Date;
}

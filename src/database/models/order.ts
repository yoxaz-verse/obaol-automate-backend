import mongoose, { Schema } from "mongoose";
import { IOrder } from "../../interfaces/order";

const LogisticsSchema = new Schema(
    {
        vehicleNo: { type: String },
        transportCompany: { type: String },
        driverName: { type: String },
        driverPhone: { type: String },
        currentLocation: { type: String },
        estimatedArrival: { type: Date },
    },
    { _id: false }
);

const OrderSchema: Schema = new Schema(
    {
        enquiry: { type: Schema.Types.ObjectId, ref: "Enquiry", required: true },
        status: { type: String, default: "Procuring" },
        trackingId: { type: String },
        logistics: [LogisticsSchema],
    },
    {
        timestamps: true,
    }
);

export const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);

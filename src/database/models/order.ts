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

const ResponsibilitiesSchema = new Schema(
    {
        procurementBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
        certificateBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
        transportBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
        shippingBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
        packagingBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
        qualityTestingBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
    },
    { _id: false }
);

const OrderSchema: Schema = new Schema(
    {
        enquiry: { type: Schema.Types.ObjectId, ref: "Inquiry", required: true },
        status: { type: String, default: "Procuring" },
        trackingId: { type: String },
        logistics: [LogisticsSchema],
        responsibilities: { type: ResponsibilitiesSchema, default: {} },
    },
    {
        timestamps: true,
    }
);

export const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);

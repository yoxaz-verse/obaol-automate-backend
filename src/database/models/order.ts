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

const MilestonesSchema = new Schema(
    {
        schedulingMode: { type: String, enum: ["IMMEDIATE", "PLANNED", "PHASED", ""], default: "" },
        schedulingFinalizedDate: { type: Date, default: null },
        schedulingNotes: { type: String, default: "" },
        qualityTestingRequired: { type: Boolean, default: true },
        procurementDate: { type: Date, default: null },
        procurementInspectionDate: { type: Date, default: null },
        procurementCompletedDate: { type: Date, default: null },
        qualitySampleSentDate: { type: Date, default: null },
        labName: { type: String, default: "" },
        labExpectedReportDate: { type: Date, default: null },
        labReportReceivedDate: { type: Date, default: null },
        qualityApprovedDate: { type: Date, default: null },
        packagingStartDate: { type: Date, default: null },
        packagingCompletedDate: { type: Date, default: null },
        certificateRequestedDate: { type: Date, default: null },
        certificateIssuedDate: { type: Date, default: null },
        transportDispatchDate: { type: Date, default: null },
        shippingBookedDate: { type: Date, default: null },
        customsClearanceDate: { type: Date, default: null },
    },
    { _id: false }
);

const OrderSchema: Schema = new Schema(
    {
        enquiry: { type: Schema.Types.ObjectId, ref: "Inquiry", required: true },
        status: { type: String, default: "Procuring" },
        profit: { type: Number, default: null },
        closedByEmployee: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
        associateCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null },
        commissionProcessedAt: { type: Date, default: null },
        trackingId: { type: String },
        logistics: [LogisticsSchema],
        responsibilities: { type: ResponsibilitiesSchema, default: {} },
        milestones: { type: MilestonesSchema, default: {} },
    },
    {
        timestamps: true,
    }
);

OrderSchema.index({ status: 1 });
OrderSchema.index({ commissionProcessedAt: 1 });
OrderSchema.index({ closedByEmployee: 1 });
OrderSchema.index({ associateCompanyId: 1 });

export const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);

import { Document, Types } from "mongoose";

export interface ILogistics {
    vehicleNo: string;
    transportCompany: string;
    driverName: string;
    driverPhone: string;
    currentLocation: string;
    estimatedArrival?: Date | null;
}

export interface IOrderResponsibilities {
    procurementBy?: "buyer" | "seller" | "obaol";
    certificateBy?: "buyer" | "seller" | "obaol";
    transportBy?: "buyer" | "seller" | "obaol";
    shippingBy?: "buyer" | "seller" | "obaol";
    packagingBy?: "buyer" | "seller" | "obaol";
    qualityTestingBy?: "buyer" | "seller" | "obaol";
}

export interface IOrderMilestones {
    schedulingMode?: "IMMEDIATE" | "PLANNED" | "PHASED" | "";
    schedulingFinalizedDate?: Date | null;
    schedulingNotes?: string;
    qualityTestingRequired?: boolean;
    procurementDate?: Date | null;
    procurementInspectionDate?: Date | null;
    procurementCompletedDate?: Date | null;
    qualitySampleSentDate?: Date | null;
    labName?: string;
    labExpectedReportDate?: Date | null;
    labReportReceivedDate?: Date | null;
    qualityApprovedDate?: Date | null;
    packagingStartDate?: Date | null;
    packagingCompletedDate?: Date | null;
    certificateRequestedDate?: Date | null;
    certificateIssuedDate?: Date | null;
    transportDispatchDate?: Date | null;
    shippingBookedDate?: Date | null;
    customsClearanceDate?: Date | null;
}

export interface IOrder extends Document {
    enquiry: Types.ObjectId;
    status: string;
    trackingId?: string;
    logistics: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateOrder {
    enquiry: Types.ObjectId;
    status?: string;
    trackingId?: string;
    logistics?: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
}

export interface IUpdateOrder {
    status?: string;
    trackingId?: string;
    logistics?: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
}

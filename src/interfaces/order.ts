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
    enquiry?: Types.ObjectId | null;
    status: string;
    workflowStage?: string;
    isExternal?: boolean;
    externalCreatedBy?: Types.ObjectId | null;
    externalTradeType?: "DOMESTIC" | "INTERNATIONAL" | null;
    externalBuyer?: { name: string; email?: string; phone?: string };
    externalSeller?: { name: string; email?: string; phone?: string };
    externalProduct?: { name: string; variant?: string; quantity?: number | null; unit?: string };
    profit?: number | null;
    closedByOperator?: Types.ObjectId | null;
    associateCompanyId?: Types.ObjectId | null;
    commissionProcessedAt?: Date | null;
    trackingId?: string;
    logistics: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
    isDemo?: boolean;
    demoTag?: string;
    demoCreatedBy?: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateOrder {
    enquiry?: Types.ObjectId | null;
    status?: string;
    workflowStage?: string;
    isExternal?: boolean;
    externalCreatedBy?: Types.ObjectId | null;
    externalTradeType?: "DOMESTIC" | "INTERNATIONAL" | null;
    externalBuyer?: { name: string; email?: string; phone?: string };
    externalSeller?: { name: string; email?: string; phone?: string };
    externalProduct?: { name: string; variant?: string; quantity?: number | null; unit?: string };
    profit?: number | null;
    closedByOperator?: Types.ObjectId | null;
    associateCompanyId?: Types.ObjectId | null;
    trackingId?: string;
    logistics?: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
    isDemo?: boolean;
    demoTag?: string;
    demoCreatedBy?: Types.ObjectId | null;
}

export interface IUpdateOrder {
    status?: string;
    workflowStage?: string;
    isExternal?: boolean;
    externalCreatedBy?: Types.ObjectId | null;
    externalTradeType?: "DOMESTIC" | "INTERNATIONAL" | null;
    externalBuyer?: { name: string; email?: string; phone?: string };
    externalSeller?: { name: string; email?: string; phone?: string };
    externalProduct?: { name: string; variant?: string; quantity?: number | null; unit?: string };
    profit?: number | null;
    closedByOperator?: Types.ObjectId | null;
    associateCompanyId?: Types.ObjectId | null;
    commissionProcessedAt?: Date | null;
    trackingId?: string;
    logistics?: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
    isDemo?: boolean;
    demoTag?: string;
    demoCreatedBy?: Types.ObjectId | null;
}

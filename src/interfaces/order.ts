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
    cargoInsuranceBy?: "buyer" | "seller" | "obaol";
    exportCustomsBy?: "buyer" | "seller" | "obaol";
    importCustomsBy?: "buyer" | "obaol";
    dutiesTaxesBy?: "buyer";
    portHandlingBy?: "buyer" | "obaol";
    destinationInlandTransportBy?: "buyer" | "obaol";
    destinationInspectionBy?: "buyer" | "obaol";
    finalDeliveryConfirmationBy?: "obaol";
}

export interface IExecutionContext {
    tradeType?: "DOMESTIC" | "INTERNATIONAL";
    originCountry?: string | null;
    originState?: string | null;
    originDistrict?: string | null;
    originPort?: string | null;
    destinationCountry?: string | null;
    destinationState?: string | null;
    destinationDistrict?: string | null;
    destinationPort?: string | null;
    routeNotes?: string | null;
}

export interface IOrderSubflowInstance {
    type: string;
    instanceKey: string;
    label?: string;
}

export interface IOrderPaymentMilestone {
    label: string;
    percent: number;
    dueAtDocType?: string | null;
    dueAtStageKey?: string | null;
    status: "PENDING" | "DUE" | "PAID";
}

export interface IOrderPaymentPlan {
    milestones: IOrderPaymentMilestone[];
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
    deliveryTargetDate?: Date | null;
}

export interface IOrder extends Document {
    enquiry?: Types.ObjectId | null;
    status: string;
    workflowStage?: string;
    isExternal?: boolean;
    externalCreatedBy?: Types.ObjectId | null;
    externalTradeType?: "DOMESTIC" | "INTERNATIONAL" | null;
    externalRole?: "BUYER" | "SELLER" | "MEDIATOR" | null;
    externalBuyer?: { name: string; email?: string; phone?: string };
    externalSeller?: { name: string; email?: string; phone?: string };
    externalProduct?: { name: string; variant?: string; quantity?: number | null; unit?: string };
    packagingSpecifications?: string;
    executionContext?: IExecutionContext;
    profit?: number | null;
    closedByOperator?: Types.ObjectId | null;
    associateCompanyId?: Types.ObjectId | null;
    commissionProcessedAt?: Date | null;
    paymentTermId?: Types.ObjectId | null;
    incotermId?: Types.ObjectId | null;
    supplierOperatorId?: Types.ObjectId | null;
    dealCloserOperatorId?: Types.ObjectId | null;
    paymentPlan?: IOrderPaymentPlan | null;
    trackingId?: string;
    logistics: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
    subflowStages?: Record<string, string>;
    subflowInstances?: IOrderSubflowInstance[];
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
    externalRole?: "BUYER" | "SELLER" | "MEDIATOR" | null;
    externalBuyer?: { name: string; email?: string; phone?: string };
    externalSeller?: { name: string; email?: string; phone?: string };
    externalProduct?: { name: string; variant?: string; quantity?: number | null; unit?: string };
    packagingSpecifications?: string;
    executionContext?: IExecutionContext;
    profit?: number | null;
    closedByOperator?: Types.ObjectId | null;
    associateCompanyId?: Types.ObjectId | null;
    paymentTermId?: Types.ObjectId | null;
    incotermId?: Types.ObjectId | null;
    supplierOperatorId?: Types.ObjectId | null;
    dealCloserOperatorId?: Types.ObjectId | null;
    paymentPlan?: IOrderPaymentPlan | null;
    trackingId?: string;
    logistics?: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
    subflowStages?: Record<string, string>;
    subflowInstances?: IOrderSubflowInstance[];
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
    paymentTermId?: Types.ObjectId | null;
    incotermId?: Types.ObjectId | null;
    supplierOperatorId?: Types.ObjectId | null;
    dealCloserOperatorId?: Types.ObjectId | null;
    paymentPlan?: IOrderPaymentPlan | null;
    trackingId?: string;
    logistics?: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    milestones?: IOrderMilestones;
    subflowStages?: Record<string, string>;
    subflowInstances?: IOrderSubflowInstance[];
    isDemo?: boolean;
    demoTag?: string;
    demoCreatedBy?: Types.ObjectId | null;
}

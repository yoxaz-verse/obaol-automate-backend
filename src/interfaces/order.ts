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

export interface IOrder extends Document {
    enquiry: Types.ObjectId;
    status: string;
    trackingId?: string;
    logistics: ILogistics[];
    responsibilities?: IOrderResponsibilities;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateOrder {
    enquiry: Types.ObjectId;
    status?: string;
    trackingId?: string;
    logistics?: ILogistics[];
    responsibilities?: IOrderResponsibilities;
}

export interface IUpdateOrder {
    status?: string;
    trackingId?: string;
    logistics?: ILogistics[];
    responsibilities?: IOrderResponsibilities;
}

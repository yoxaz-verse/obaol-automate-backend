import { Document, Types } from "mongoose";

export interface ILogistics {
    vehicleNo: string;
    transportCompany: string;
    driverName: string;
    driverPhone: string;
    currentLocation: string;
    estimatedArrival?: Date | null;
}

export interface IOrder extends Document {
    enquiry: Types.ObjectId;
    status: string;
    trackingId?: string;
    logistics: ILogistics[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateOrder {
    enquiry: Types.ObjectId;
    status?: string;
    trackingId?: string;
    logistics?: ILogistics[];
}

export interface IUpdateOrder {
    status?: string;
    trackingId?: string;
    logistics?: ILogistics[];
}

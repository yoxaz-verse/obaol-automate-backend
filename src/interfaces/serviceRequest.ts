import { Document, Types } from "mongoose";

export type ServiceRequestType =
  | "PROCUREMENT"
  | "QUALITY_TESTING"
  | "PACKAGING"
  | "TRANSPORTATION"
  | "CUSTOMS_CLEARANCE"
  | "WAREHOUSING";

export type ServiceRequestStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface IServiceRequestBid {
  company: Types.ObjectId | string;
  amount?: number | null;
  note?: string;
  status?: "OPEN" | "SUBMITTED" | "WITHDRAWN" | "AWARDED";
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IServiceRequest extends Document {
  requestType: ServiceRequestType;
  title: string;
  serviceSpecifications: string;
  fromState: Types.ObjectId;
  fromDistrict: Types.ObjectId;
  toState?: Types.ObjectId | null;
  toDistrict?: Types.ObjectId | null;
  requiredFromDate?: Date | null;
  requiredToDate?: Date | null;
  warehouseId?: Types.ObjectId | string | null;
  createdByUserId: Types.ObjectId;
  createdByRole: string;
  createdByAssociateId?: Types.ObjectId | null;
  createdByCompanyId?: Types.ObjectId | null;
  status: ServiceRequestStatus;
  candidateProviders: Array<Types.ObjectId | string>;
  bids: IServiceRequestBid[];
  committedProvider?: Types.ObjectId | string | null;
  bidAmount?: number | null;
  commitNote?: string;
  committedAt?: Date | null;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

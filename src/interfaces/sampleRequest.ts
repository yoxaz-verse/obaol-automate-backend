import { Document, Types } from "mongoose";

export type SampleRequestStatus =
  | "REQUESTED"
  | "QUOTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export interface ISampleRequest extends Document {
  variantRateId: Types.ObjectId;
  productVariant: Types.ObjectId;
  supplierCompanyId: Types.ObjectId;
  buyerAssociateId: Types.ObjectId;
  requestState: Types.ObjectId;
  requestDistrict: Types.ObjectId;
  requestCity: Types.ObjectId;
  requestAddress: string;
  requestPincode: string;
  status: SampleRequestStatus;
  requestedAt: Date;
  quotedAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  supplierMinQty?: number | null;
  supplierPrice?: number | null;
  markupPercent: number;
  buyerPrice?: number | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

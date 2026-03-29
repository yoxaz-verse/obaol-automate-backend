import { Document, Types } from "mongoose";

export type SampleRequestStatus =
  | "REQUESTED"
  | "QUOTED"
  | "ACCEPTED"
  | "PAYMENT_RECEIVED"
  | "PREPARING_PACKAGING"
  | "PACKAGED"
  | "COURIER_SUBMITTED"
  | "IN_TRANSIT"
  | "RECEIPT_CONFIRMED"
  | "REJECTED"
  | "CANCELLED";

export interface ISampleRequest extends Document {
  variantRateId: Types.ObjectId;
  productVariant: Types.ObjectId;
  supplierCompanyId: Types.ObjectId;
  buyerAssociateId: Types.ObjectId;
  requestState: Types.ObjectId;
  requestDistrict: Types.ObjectId;
  requestDivision: Types.ObjectId;
  requestCity?: Types.ObjectId;
  requestAddress: string;
  requestPincode: string;
  requestedSampleQtyKg: number;
  status: SampleRequestStatus;
  requestedAt: Date;
  quotedAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  paymentReceivedAt?: Date | null;
  packagingStartedAt?: Date | null;
  packagedAt?: Date | null;
  courierSubmittedAt?: Date | null;
  courierAgencyName?: string | null;
  courierTrackingNumber?: string | null;
  inTransitAt?: Date | null;
  receiptConfirmedAt?: Date | null;
  receiptFileId?: Types.ObjectId | null;
  supplierMinQty?: number | null;
  supplierPrice?: number | null;
  markupPercent: number;
  buyerPrice?: number | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

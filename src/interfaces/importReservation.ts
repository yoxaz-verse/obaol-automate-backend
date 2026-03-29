import { Document, Types } from "mongoose";

export type ImportReservationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "LOCKED"
  | "ACCEPTED";

export interface IImportReservation extends Document {
  listingId: Types.ObjectId;
  buyerAssociateId: Types.ObjectId;
  buyerCompanyId: Types.ObjectId;
  quantityRequested: number;
  status: ImportReservationStatus;
  reservationStatus?: ImportReservationStatus;
  linkedEnquiryId?: Types.ObjectId | null;
  requestedAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  cancelledAt?: Date | null;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

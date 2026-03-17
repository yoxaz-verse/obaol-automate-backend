import mongoose, { Schema } from "mongoose";
import { IImportReservation } from "../../interfaces/importReservation";

const ImportReservationSchema: Schema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "ImportListing", required: true, index: true },
    buyerAssociateId: { type: Schema.Types.ObjectId, ref: "Associate", required: true, index: true },
    buyerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
    quantityRequested: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    linkedEnquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null },
    requestedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ImportReservationSchema.index({ listingId: 1, createdAt: -1 });
ImportReservationSchema.index({ buyerAssociateId: 1, createdAt: -1 });

export const ImportReservationModel = mongoose.model<IImportReservation>(
  "ImportReservation",
  ImportReservationSchema
);


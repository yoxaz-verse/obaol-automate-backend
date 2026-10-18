import mongoose, { Schema } from "mongoose";
import { IProductBidOffer } from "../../interfaces/productBidding";

const RevisionSchema = new Schema({
  unitPrice: { type: Number, required: true, min: 0.000001 },
  listing: { type: Schema.Types.ObjectId, ref: "VariantRate", required: true },
  offeredQuantity: { type: Number, required: true, min: 0.000001 },
  unit: { type: String, enum: ["KG", "MT", "Quintal"], required: true },
  validUntil: { type: Date, default: null },
  note: { type: String, trim: true, maxlength: 2000, default: "" },
  revisedAt: { type: Date, required: true },
  revisedBy: { type: Schema.Types.ObjectId, ref: "Associate", required: true },
}, { _id: false });

const ProductBidOfferSchema = new Schema<IProductBidOffer>({
  event: { type: Schema.Types.ObjectId, ref: "ProductBiddingEvent", required: true, index: true },
  seller: { type: Schema.Types.ObjectId, ref: "Associate", required: true, index: true },
  sellerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  listing: { type: Schema.Types.ObjectId, ref: "VariantRate", required: true },
  unitPrice: { type: Number, required: true, min: 0.000001 },
  offeredQuantity: { type: Number, required: true, min: 0.000001 },
  unit: { type: String, enum: ["KG", "MT", "Quintal"], required: true },
  validUntil: { type: Date, default: null },
  note: { type: String, trim: true, maxlength: 2000, default: "" },
  status: { type: String, enum: ["SUBMITTED", "WITHDRAWN", "AWARDED", "NOT_SELECTED"], default: "SUBMITTED", index: true },
  revisions: { type: [RevisionSchema], default: [] },
}, { timestamps: true });

ProductBidOfferSchema.index({ event: 1, sellerCompany: 1 }, { unique: true });
ProductBidOfferSchema.index({ event: 1, status: 1, createdAt: -1 });

export const ProductBidOfferModel = mongoose.model<IProductBidOffer>("ProductBidOffer", ProductBidOfferSchema);

import mongoose, { Schema } from "mongoose";
import { IProductBiddingEvent } from "../../interfaces/productBidding";

const ProductBiddingEventSchema = new Schema<IProductBiddingEvent>({
  buyer: { type: Schema.Types.ObjectId, ref: "Associate", required: true, index: true },
  buyerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  productVariant: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null, index: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  unit: { type: String, enum: ["KG", "MT", "Quintal"], required: true },
  specifications: { type: String, trim: true, maxlength: 2000, default: "" },
  deliveryLocation: { type: String, trim: true, maxlength: 500, default: "" },
  deliveryDate: { type: Date, default: null },
  buyerNotes: { type: String, trim: true, maxlength: 2000, default: "" },
  opensAt: { type: Date, default: null, index: true },
  closesAt: { type: Date, default: null, index: true },
  status: { type: String, enum: ["DRAFT", "SCHEDULED", "OPEN", "CLOSED", "AWARDED", "CANCELLED"], default: "DRAFT", index: true },
  winningOffer: { type: Schema.Types.ObjectId, ref: "ProductBidOffer", default: null },
  draftEnquiry: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null },
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: Schema.Types.ObjectId, default: null },
  cancellationReason: { type: String, trim: true, maxlength: 1000, default: "" },
  openedNotifiedAt: { type: Date, default: null },
  closingSoonNotifiedAt: { type: Date, default: null },
  closedNotifiedAt: { type: Date, default: null },
}, { timestamps: true });

ProductBiddingEventSchema.index({ buyerCompany: 1, status: 1, createdAt: -1 });
ProductBiddingEventSchema.index({ product: 1, productVariant: 1, status: 1, opensAt: 1, closesAt: 1 });

export const ProductBiddingEventModel = mongoose.model<IProductBiddingEvent>("ProductBiddingEvent", ProductBiddingEventSchema);

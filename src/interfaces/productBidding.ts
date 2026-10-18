import { Document, Types } from "mongoose";

export type ProductBiddingStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED" | "AWARDED" | "CANCELLED";
export type ProductBidOfferStatus = "SUBMITTED" | "WITHDRAWN" | "AWARDED" | "NOT_SELECTED";

export interface IProductBiddingEvent extends Document {
  buyer: Types.ObjectId;
  buyerCompany: Types.ObjectId;
  title: string;
  product: Types.ObjectId;
  productVariant?: Types.ObjectId | null;
  quantity: number;
  unit: "KG" | "MT" | "Quintal";
  specifications?: string;
  deliveryLocation?: string;
  deliveryDate?: Date | null;
  buyerNotes?: string;
  opensAt?: Date | null;
  closesAt?: Date | null;
  status: ProductBiddingStatus;
  winningOffer?: Types.ObjectId | null;
  draftEnquiry?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  cancelledBy?: Types.ObjectId | null;
  cancellationReason?: string;
  openedNotifiedAt?: Date | null;
  closingSoonNotifiedAt?: Date | null;
  closedNotifiedAt?: Date | null;
}

export interface IProductBidOffer extends Document {
  event: Types.ObjectId;
  seller: Types.ObjectId;
  sellerCompany: Types.ObjectId;
  listing: Types.ObjectId;
  unitPrice: number;
  offeredQuantity: number;
  unit: "KG" | "MT" | "Quintal";
  validUntil?: Date | null;
  note?: string;
  status: ProductBidOfferStatus;
  revisions: Array<{ unitPrice: number; listing: Types.ObjectId; offeredQuantity: number; unit: string; validUntil?: Date | null; note?: string; revisedAt: Date; revisedBy: Types.ObjectId }>;
}

import mongoose, { Schema } from "mongoose";

export const LISTING_INTERACTION_TYPES = ["LISTING_CLICK", "DETAIL_VIEW"] as const;

const ListingInteractionEventSchema = new Schema(
  {
    variantRate: { type: Schema.Types.ObjectId, ref: "VariantRate", required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productVariant: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true, index: true },
    type: { type: String, enum: LISTING_INTERACTION_TYPES, required: true, index: true },
    visitorKey: { type: String, required: true, maxlength: 128, index: true, select: false },
    sessionId: { type: String, required: true, maxlength: 120, select: false },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ListingInteractionEventSchema.index(
  { variantRate: 1, type: 1, visitorKey: 1, sessionId: 1 },
  { unique: true }
);
ListingInteractionEventSchema.index({ variantRate: 1, occurredAt: -1, type: 1 });

export const ListingInteractionEventModel = mongoose.model(
  "ListingInteractionEvent",
  ListingInteractionEventSchema
);

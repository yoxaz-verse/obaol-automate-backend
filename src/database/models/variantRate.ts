import mongoose, { Schema } from "mongoose";
import { IVariantRate } from "../../interfaces/variantRate";

const VariantRateSchema: Schema = new Schema({
  rate: { type: Number, required: true },
  commission: { type: Number },
  selected: { type: Boolean, default: false },
  productVariant: {
    type: Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: true,
  },
  associate: { type: Schema.Types.ObjectId, ref: "Associate" },
  isLive: { type: Boolean, default: false },
  duration: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export const VariantRateModel = mongoose.model<IVariantRate>(
  "VariantRate",
  VariantRateSchema
);

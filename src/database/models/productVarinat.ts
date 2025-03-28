import { IProductVariant } from "../../interfaces/productVariant";
import mongoose, { Schema } from "mongoose";

const ProductVariantSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  isLive: { type: Boolean, default: false },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ProductVariantModel = mongoose.model<IProductVariant>(
  "ProductVariant",
  ProductVariantSchema
);

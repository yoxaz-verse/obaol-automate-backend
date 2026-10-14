import { IProductVariant } from "../../interfaces/productVariant";
import mongoose, { Schema } from "mongoose";
import { addCatalogModerationFields } from "./plugins/catalogModeration.plugin";

const ProductVariantSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  isLive: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false, index: true },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

addCatalogModerationFields(ProductVariantSchema);

export const ProductVariantModel = mongoose.model<IProductVariant>(
  "ProductVariant",
  ProductVariantSchema
);

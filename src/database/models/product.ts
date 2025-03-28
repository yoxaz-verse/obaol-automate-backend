import { IProduct } from "../../interfaces/product";
import mongoose, { Document, Schema } from "mongoose";

const ProductSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: "SubCategory",
    required: true,
  },
  locations: [{ type: Schema.Types.ObjectId, ref: "Location" }],
  createdAt: { type: Date, default: Date.now },
});

export const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);

import { ICategory } from "../../interfaces/category";
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  inventoryManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryManager",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export const CategoryModel = mongoose.model<ICategory>(
  "Category",
  categorySchema
);

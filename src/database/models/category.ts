import { ICategory } from "../../interfaces/category";
import mongoose from "mongoose";
import { addCatalogModerationFields } from "./plugins/catalogModeration.plugin";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  inventoryManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryManager",
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

addCatalogModerationFields(categorySchema);

export const CategoryModel = mongoose.model<ICategory>(
  "Category",
  categorySchema
);

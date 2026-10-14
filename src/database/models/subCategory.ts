import mongoose, { Document } from "mongoose";
import { ISubCategory } from "../../interfaces/subCategory";
import { addCatalogModerationFields } from "./plugins/catalogModeration.plugin";

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

addCatalogModerationFields(subCategorySchema);

export const SubCategoryModel = mongoose.model<ISubCategory>(
  "SubCategory",
  subCategorySchema
);

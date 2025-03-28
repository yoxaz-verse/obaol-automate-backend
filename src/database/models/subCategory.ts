import mongoose, { Document } from "mongoose";
import { ISubCategory } from "../../interfaces/subCategory";

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export const SubCategoryModel = mongoose.model<ISubCategory>(
  "SubCategory",
  subCategorySchema
);

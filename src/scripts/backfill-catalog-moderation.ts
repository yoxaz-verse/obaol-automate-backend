import dotenv from "dotenv";
import mongoose from "mongoose";
import { CategoryModel } from "../database/models/category";
import { SubCategoryModel } from "../database/models/subCategory";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";
import { VariantRateModel } from "../database/models/variantRate";

dotenv.config();

async function run() {
  const uri = String(process.env.MONGODB_URI || process.env.MONGO_URI || "");
  if (!uri) throw new Error("MONGODB_URI is missing.");
  await mongoose.connect(uri);
  try {
    const models = [CategoryModel, SubCategoryModel, ProductModel, ProductVariantModel, VariantRateModel];
    for (const model of models) {
      const result = await model.updateMany(
        { $or: [{ approvalStatus: { $exists: false } }, { approvalStatus: null }, { approvalStatus: "" }] },
        { $set: { approvalStatus: "APPROVED", approvedAt: new Date(), reviewNotes: "" } },
      );
      console.log(`${model.modelName}: ${result.modifiedCount} records marked APPROVED`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => { console.error("Catalog moderation backfill failed:", error?.message || error); process.exitCode = 1; });

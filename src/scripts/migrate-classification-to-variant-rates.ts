import mongoose from "mongoose";
import dotenv from "dotenv";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";
import { VariantRateModel } from "../database/models/variantRate";

dotenv.config();

const fields = [
  "isConventional", "isNatural", "isOrganic", "isIpmQuality", "isOrganicCertified",
  "organicCertificationBody", "organicCertificationBodyOther", "organicCertificateNumber",
  "organicCertificateValidFrom", "organicCertificateValidTo", "organicCertifiedQuantity",
  "organicCertifiedQuantityUnit", "organicCertificationScope", "organicCertificateDocumentUrl",
  "isGiTagged", "giName", "giCertificateNumber", "giDocumentUrl",
] as const;

export async function migrateClassificationToVariantRates() {
  const products = await ProductModel.collection.find(
    { $or: fields.map((field) => ({ [field]: { $exists: true } })) },
    { projection: Object.fromEntries(fields.map((field) => [field, 1])) },
  ).toArray();
  let updatedRates = 0;

  for (const product of products) {
    const variantIds = await ProductVariantModel.distinct("_id", { product: product._id });
    if (!variantIds.length) continue;

    const classification = Object.fromEntries(fields
      .filter((field) => (product as any)[field] !== undefined)
      .map((field) => [field, (product as any)[field]]));
    const hasPrimary = Boolean(classification.isNatural || classification.isOrganic || classification.isIpmQuality);
    classification.isConventional = Boolean(classification.isConventional) || !hasPrimary;
    classification.isNatural = Boolean(classification.isNatural);
    classification.isOrganic = Boolean(classification.isOrganic);
    classification.isIpmQuality = Boolean(classification.isIpmQuality);
    classification.isGiTagged = Boolean(classification.isGiTagged);

    const result = await VariantRateModel.updateMany(
      { productVariant: { $in: variantIds } },
      { $set: classification },
    );
    updatedRates += result.modifiedCount;
  }

  const unset = Object.fromEntries(fields.map((field) => [field, ""]));
  const cleanedProducts = await ProductModel.collection.updateMany({}, { $unset: unset });
  return { products: products.length, updatedRates, cleanedProducts: cleanedProducts.modifiedCount };
}

if (require.main === module) {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI or MONGODB_URI is required");
  mongoose.connect(uri)
    .then(migrateClassificationToVariantRates)
    .then((result) => console.log("Variant-rate classification migration complete:", result))
    .finally(() => mongoose.disconnect());
}

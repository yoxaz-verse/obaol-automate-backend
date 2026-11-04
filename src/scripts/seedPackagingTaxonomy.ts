import mongoose from "mongoose";
import { MONGODB_URI } from "../config";
import { ProductModel } from "../database/models/product";
import { ServiceTaxonomyModel } from "../database/models/serviceTaxonomy";

export const PACKAGING_DEFAULTS: Record<string, string[]> = {
  COMMODITY: ["Rice", "Wheat", "Maize", "Pulses", "Spices", "Tea", "Coffee", "Nuts", "Seeds", "Processed food ingredients"],
  SERVICE: ["Bag manufacturing", "Filling and sealing", "Label printing", "Packaging design", "Repacking", "Contract packing"],
  FORMAT: ["PP woven sack", "FIBC / jumbo bag", "Kraft paper bag", "Laminated pouch", "Liner bag", "Corrugated carton", "Drum", "Jar or container"],
  MATERIAL: ["PP woven", "HDPE", "LDPE", "BOPP laminate", "Kraft paper", "Corrugated board", "Jute", "Metal", "Food-grade plastic"],
  MACHINERY: ["Automatic filling line", "Bag stitching machine", "Heat sealer", "Vacuum packer", "Form-fill-seal machine", "Label printer"],
  QUALITY_OPTION: ["Food-grade contact material", "Moisture barrier", "Oxygen barrier", "Tamper evident", "Vacuum packed", "Pest resistant", "Export ready", "Recyclable"],
  CERTIFICATION: ["BRCGS Packaging Materials", "FSSC 22000", "ISO 9001", "ISO 22000", "FSSAI", "FSC Chain of Custody"],
};

export async function seedPackagingTaxonomy(productNames: string[]) {
  const groups = { ...PACKAGING_DEFAULTS, COMMODITY: [...PACKAGING_DEFAULTS.COMMODITY, ...productNames] };
  let upserts = 0;
  for (const [kind, names] of Object.entries(groups)) {
    for (const name of [...new Set(names.map((value) => String(value || "").trim()).filter(Boolean))]) {
      const result = await ServiceTaxonomyModel.updateOne(
        { department: "PACKAGING", kind, name },
        { $setOnInsert: { department: "PACKAGING", kind, name, status: "ACTIVE", isDeleted: false, description: "" } },
        { upsert: true },
      );
      upserts += result.upsertedCount || 0;
    }
  }
  return upserts;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const products: any[] = await ProductModel.find({ isDeleted: { $ne: true }, moderationStatus: { $in: ["APPROVED", null] } }).select("name").lean();
  const upserts = await seedPackagingTaxonomy(products.map((product) => product.name));
  console.log(`Packaging taxonomy ready (${upserts} new values).`);
  await mongoose.disconnect();
}

if (require.main === module) run().catch((error) => { console.error(error); process.exitCode = 1; });

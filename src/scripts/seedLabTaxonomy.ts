import mongoose from "mongoose";
import { MONGODB_URI } from "../config";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CertificationModel } from "../database/models/certification";
import { ProductModel } from "../database/models/product";
import { LabTaxonomyModel } from "../database/models/labTaxonomy";

async function upsert(kind: string, names: string[]) {
  for (const name of [...new Set(names.map((x) => String(x || "").trim()).filter(Boolean))]) {
    await LabTaxonomyModel.updateOne({ kind, name }, { $setOnInsert: { kind, name, status: "ACTIVE", isDeleted: false } }, { upsert: true });
  }
}
async function run() {
  await mongoose.connect(MONGODB_URI);
  const [companies, certifications, products]: any[] = await Promise.all([
    AssociateCompanyModel.find({ isQualityLabListed: true }).select("labTests labSpecifications labAcceptedItems").lean(),
    CertificationModel.find({ isDeleted: { $ne: true } }).select("name").lean(),
    ProductModel.find({ isDeleted: { $ne: true } }).select("name").lean(),
  ]);
  await upsert("TEST", companies.flatMap((x: any) => x.labTests || []));
  await upsert("PARAMETER", companies.flatMap((x: any) => x.labSpecifications || []));
  await upsert("ACCREDITATION", certifications.map((x: any) => x.name));
  await upsert("COMMODITY", [...products.map((x: any) => x.name), ...companies.flatMap((x: any) => x.labAcceptedItems || [])]);
  console.log("Lab taxonomy seeded from approved platform and legacy lab data.");
  await mongoose.disconnect();
}
run().catch((error) => { console.error(error); process.exitCode = 1; });

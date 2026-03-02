import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";

dotenv.config();

const inferCapabilities = (companyTypeName: string): string[] => {
  const n = String(companyTypeName || "").toLowerCase();
  const all = new Set<string>();
  if (n.includes("logistics") || n.includes("transport")) all.add("TRANSPORTATION");
  if (n.includes("shipping") || n.includes("freight") || n.includes("forward")) all.add("SHIPPING");
  if (n.includes("pack")) all.add("PACKAGING");
  if (n.includes("quality") || n.includes("lab") || n.includes("test")) all.add("QUALITY_TESTING");
  if (n.includes("cert")) all.add("CERTIFICATION");
  if (n.includes("procure") || n.includes("sourc") || n.includes("trader") || n.includes("supplier")) all.add("PROCUREMENT");
  return Array.from(all);
};

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    const rows = await AssociateCompanyModel.find({})
      .populate("companyType", "name")
      .select("_id serviceCapabilities companyType");

    let updated = 0;
    for (const row of rows as any[]) {
      if (Array.isArray(row.serviceCapabilities) && row.serviceCapabilities.length > 0) continue;
      const inferred = inferCapabilities(String(row?.companyType?.name || ""));
      if (!inferred.length) continue;
      row.serviceCapabilities = inferred;
      await row.save();
      updated++;
    }
    console.log(`Updated companies with inferred capabilities: ${updated}`);
  } catch (error: any) {
    console.error("Failed to backfill service capabilities:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();


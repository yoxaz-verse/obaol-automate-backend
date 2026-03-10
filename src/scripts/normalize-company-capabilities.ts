import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { normalizeCapabilities } from "../utils/companyCapabilities";

dotenv.config();

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    const rows = await AssociateCompanyModel.find({})
      .select("_id name serviceCapabilities")
      .lean();

    let updated = 0;
    for (const row of rows as any[]) {
      const current = Array.isArray(row?.serviceCapabilities)
        ? row.serviceCapabilities.map((value: any) => String(value || ""))
        : [];
      const normalized = normalizeCapabilities(current);
      const currentKey = JSON.stringify(current);
      const normalizedKey = JSON.stringify(normalized);
      if (currentKey === normalizedKey) continue;

      await AssociateCompanyModel.findByIdAndUpdate(row._id, {
        $set: { serviceCapabilities: normalized },
      });
      updated += 1;
    }

    console.log(`Normalized serviceCapabilities for companies: ${updated}`);
  } catch (error: any) {
    console.error("Failed to normalize service capabilities:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

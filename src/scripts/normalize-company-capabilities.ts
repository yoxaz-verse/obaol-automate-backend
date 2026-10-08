import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { normalizeCompanyFunctionSlugs } from "../utils/companyCapabilities";

dotenv.config();

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    const rows = await AssociateCompanyModel.find({})
      .select("_id name providedCapabilities soughtCapabilities")
      .lean();

    let updated = 0;
    for (const row of rows as any[]) {
      const provided = normalizeCompanyFunctionSlugs(row?.providedCapabilities || []);
      const sought = normalizeCompanyFunctionSlugs(row?.soughtCapabilities || []);
      if (JSON.stringify(row?.providedCapabilities || []) === JSON.stringify(provided)
        && JSON.stringify(row?.soughtCapabilities || []) === JSON.stringify(sought)) continue;

      await AssociateCompanyModel.findByIdAndUpdate(row._id, {
        $set: { providedCapabilities: provided, soughtCapabilities: sought },
      });
      updated += 1;
    }

    console.log(`Normalized company capability profiles: ${updated}`);
  } catch (error: any) {
    console.error("Failed to normalize service capabilities:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

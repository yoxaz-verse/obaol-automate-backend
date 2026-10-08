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

    const companies = mongoose.connection.collection("associatecompanies");
    const result = await companies.updateMany({}, [
      {
        $set: {
          providedCapabilities: { $ifNull: ["$providedCapabilities", { $ifNull: ["$serviceCapabilities", []] }] },
          soughtCapabilities: { $ifNull: ["$soughtCapabilities", []] },
          providedCapabilityPriorities: { $ifNull: ["$providedCapabilityPriorities", { $ifNull: ["$companyFunctionPriorities", []] }] },
          soughtCapabilityPriorities: { $ifNull: ["$soughtCapabilityPriorities", []] },
        },
      },
      { $unset: ["companyType", "serviceCapabilities", "companyFunctionPriorities"] },
    ]);

    const rows = await AssociateCompanyModel.find({}).select("_id providedCapabilities soughtCapabilities").lean();
    for (const row of rows as any[]) {
      await AssociateCompanyModel.findByIdAndUpdate(row._id, {
        $set: {
          providedCapabilities: normalizeCompanyFunctionSlugs(row.providedCapabilities),
          soughtCapabilities: normalizeCompanyFunctionSlugs(row.soughtCapabilities),
        },
      });
    }

    console.log(`Company capability profiles migrated: ${result.modifiedCount}`);
  } catch (error: any) {
    console.error("Failed to migrate company capability profiles:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

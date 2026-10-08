import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { normalizeCompanyFunctionSlugs } from "../utils/companyCapabilities";
import { seedCompanyFunctions } from "../seeds/companyFunctions.seed";

dotenv.config();

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    await seedCompanyFunctions();
    const oldImport = await CompanyFunctionModel.findOne({ slug: "importing-distribution" }).select("_id").lean();
    const indiaImport = await CompanyFunctionModel.findOne({ slug: "importing-to-india" }).select("_id").lean();

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

    const rows = await AssociateCompanyModel.find({})
      .select("_id providedCapabilities soughtCapabilities providedCapabilityPriorities soughtCapabilityPriorities")
      .lean();
    for (const row of rows as any[]) {
      const provided = normalizeCompanyFunctionSlugs(row.providedCapabilities);
      const sought = normalizeCompanyFunctionSlugs(row.soughtCapabilities);
      const normalizePriorityIds = (values: unknown[]) => Array.from(new Set(
        (Array.isArray(values) ? values : [])
          .map((value) => String(value))
          .map((value) => oldImport?._id && indiaImport?._id && value === String(oldImport._id) ? String(indiaImport._id) : value)
      )).slice(0, 3);
      await AssociateCompanyModel.findByIdAndUpdate(row._id, {
        $set: {
          providedCapabilities: provided,
          soughtCapabilities: sought,
          providedCapabilityPriorities: normalizePriorityIds(row.providedCapabilityPriorities),
          soughtCapabilityPriorities: normalizePriorityIds(row.soughtCapabilityPriorities),
        },
      });
    }

    if (oldImport?._id && indiaImport?._id) {
      await CompanyFunctionModel.updateOne({ _id: oldImport._id }, { $set: { isActive: false } });
    }

    const associates = mongoose.connection.collection("associates");
    const legacyAssociates = await associates.find({ tradeMode: { $exists: true } }, { projection: { associateCompany: 1, tradeMode: 1 } }).toArray();
    for (const associate of legacyAssociates) {
      const mode = String(associate.tradeMode || "").toUpperCase();
      const additions = mode === "BUY" ? ["buying"] : mode === "SELL" ? ["selling"] : mode === "BOTH" ? ["buying", "selling"] : [];
      if (associate.associateCompany && additions.length) {
        await companies.updateOne(
          { _id: associate.associateCompany },
          { $addToSet: { providedCapabilities: { $each: additions } } }
        );
      }
    }
    await associates.updateMany({ tradeMode: { $exists: true } }, { $unset: { tradeMode: "" } });

    console.log(`Company capability profiles migrated: ${result.modifiedCount}; legacy associate modes processed: ${legacyAssociates.length}`);
  } catch (error: any) {
    console.error("Failed to migrate company capability profiles:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

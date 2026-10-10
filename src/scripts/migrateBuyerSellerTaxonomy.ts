import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { CompanyFunctionMappingModel } from "../database/models/companyFunctionMapping";
import { CompanySubFunctionModel } from "../database/models/companySubFunction";
import { migrateBuyerSellerProfile } from "../utils/buyerSellerMigration";

dotenv.config();

type RoleMigration = {
  legacySlug: "buying" | "selling";
  slug: "buyer" | "seller";
  name: "Buyer" | "Seller";
  description: string;
};

const ROLE_MIGRATIONS: RoleMigration[] = [
  { legacySlug: "buying", slug: "buyer", name: "Buyer", description: "A company that purchases commodities or products." },
  { legacySlug: "selling", slug: "seller", name: "Seller", description: "A company that sells or supplies commodities or products." },
];

async function resolveCanonicalFunction(config: RoleMigration) {
  const legacy = await CompanyFunctionModel.findOne({ slug: config.legacySlug });
  let canonical = await CompanyFunctionModel.findOne({ slug: config.slug });
  const legacyId = legacy?._id ? String(legacy._id) : "";

  if (!canonical && legacy) {
    legacy.set({ slug: config.slug, name: config.name, description: config.description, isActive: true });
    canonical = await legacy.save();
  } else if (!canonical) {
    canonical = await CompanyFunctionModel.create({
      slug: config.slug,
      name: config.name,
      description: config.description,
      isActive: true,
    });
  } else {
    canonical.set({ name: config.name, description: config.description, isActive: true });
    await canonical.save();
  }

  return {
    canonical,
    legacy: legacy && String(legacy._id) !== String(canonical._id) ? legacy : null,
    legacyId,
  };
}

async function mergeLegacyFunctionReferences(legacyId: string, canonicalId: string) {
  if (!legacyId || legacyId === canonicalId) return;

  await CompanySubFunctionModel.updateMany({ functionId: legacyId }, { $set: { functionId: canonicalId } });
  const mappings = await CompanyFunctionMappingModel.find({ functionId: legacyId }).lean();
  for (const mapping of mappings as any[]) {
    const duplicate = await CompanyFunctionMappingModel.findOne({
      _id: { $ne: mapping._id },
      companyId: mapping.companyId,
      functionId: canonicalId,
      subFunctionId: mapping.subFunctionId,
    }).select("_id").lean();
    if (duplicate) await CompanyFunctionMappingModel.deleteOne({ _id: mapping._id });
    else await CompanyFunctionMappingModel.updateOne({ _id: mapping._id }, { $set: { functionId: canonicalId } });
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || "";
  if (!uri) throw new Error("Missing Mongo connection string.");
  await mongoose.connect(uri);

  try {
    const buyer = await resolveCanonicalFunction(ROLE_MIGRATIONS[0]);
    const seller = await resolveCanonicalFunction(ROLE_MIGRATIONS[1]);
    const buyerId = String(buyer.canonical._id);
    const sellerId = String(seller.canonical._id);

    const companies = await AssociateCompanyModel.find({})
      .select("_id providedCapabilities soughtCapabilities providedCapabilityPriorities soughtCapabilityPriorities")
      .lean();

    for (const company of companies as any[]) {
      const migrated = migrateBuyerSellerProfile(company, {
        legacyBuyerId: buyer.legacyId || buyerId,
        legacySellerId: seller.legacyId || sellerId,
        buyerId,
        sellerId,
        hasSeparateLegacyBuyer: Boolean(buyer.legacy),
        hasSeparateLegacySeller: Boolean(seller.legacy),
      });

      await AssociateCompanyModel.collection.updateOne(
        { _id: company._id },
        {
          $set: {
            ...migrated,
          },
        }
      );
    }

    await mergeLegacyFunctionReferences(buyer.legacyId, buyerId);
    await mergeLegacyFunctionReferences(seller.legacyId, sellerId);
    if (buyer.legacy) await CompanyFunctionModel.deleteOne({ _id: buyer.legacy._id });
    if (seller.legacy) await CompanyFunctionModel.deleteOne({ _id: seller.legacy._id });

    console.log(`Buyer/Seller taxonomy migrated for ${companies.length} companies.`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Failed to migrate Buyer/Seller taxonomy:", error);
  process.exitCode = 1;
});

import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { CompanyFunctionMappingModel } from "../database/models/companyFunctionMapping";
import { CompanySubFunctionModel } from "../database/models/companySubFunction";
import { migrateBuyerSellerProfile } from "../utils/buyerSellerMigration";
import { SidebarGovernanceModel } from "../database/models/sidebarGovernance";
import { canonicalizeGovernanceMappings } from "../utils/sidebarGovernanceRegistry";

dotenv.config();
const apply = process.argv.includes("--apply");

type RoleMigration = {
  legacySlugs: string[];
  slug: "buyer" | "seller";
  name: "Buyer" | "Seller";
  description: string;
};

const ROLE_MIGRATIONS: RoleMigration[] = [
  { legacySlugs: ["buy", "buying"], slug: "buyer", name: "Buyer", description: "A company that purchases commodities or products." },
  { legacySlugs: ["sell", "selling"], slug: "seller", name: "Seller", description: "A company that sells or supplies commodities or products." },
];

async function resolveCanonicalFunction(config: RoleMigration) {
  const legacyRows = await CompanyFunctionModel.find({ slug: { $in: config.legacySlugs } }).sort({ createdAt: 1 });
  let canonical = await CompanyFunctionModel.findOne({ slug: config.slug });

  if (!canonical && legacyRows[0]) {
    legacyRows[0].set({ slug: config.slug, name: config.name, description: config.description, isActive: true });
    canonical = await legacyRows[0].save();
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
    legacy: legacyRows.filter((row) => String(row._id) !== String(canonical._id)),
    legacyIds: legacyRows.map((row) => String(row._id)),
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

async function migrateSidebarGovernance() {
  const config = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" });
  if (!config) return;
  const draft = canonicalizeGovernanceMappings(config.draft?.mappings as any[]);
  const published = canonicalizeGovernanceMappings(config.published?.mappings as any[]);
  const draftChanged = JSON.stringify(draft) !== JSON.stringify((config.draft?.mappings || []).map((row: any) => ({ functionSlug: row.functionSlug, routePath: row.routePath, placement: row.placement, status: row.status, order: row.order })));
  const publishedChanged = JSON.stringify(published) !== JSON.stringify((config.published?.mappings || []).map((row: any) => ({ functionSlug: row.functionSlug, routePath: row.routePath, placement: row.placement, status: row.status, order: row.order })));
  if (!draftChanged && !publishedChanged) return;
  const now = new Date();
  if (draftChanged) config.draft = { revision: Number(config.draft?.revision || 0) + 1, mappings: draft, updatedAt: now, updatedBy: config.draft?.updatedBy } as any;
  if (publishedChanged) config.published = { revision: Number(config.published?.revision || 0) + 1, mappings: published, updatedAt: now, updatedBy: config.published?.updatedBy } as any;
  await config.save();
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || "";
  if (!uri) throw new Error("Missing Mongo connection string.");
  await mongoose.connect(uri);

  try {
    if (!apply) {
      const [legacyFunctions, canonicalFunctions, companyCount, governance] = await Promise.all([
        CompanyFunctionModel.countDocuments({ slug: { $in: ROLE_MIGRATIONS.flatMap((row) => row.legacySlugs) } }),
        CompanyFunctionModel.countDocuments({ slug: { $in: ROLE_MIGRATIONS.map((row) => row.slug) } }),
        AssociateCompanyModel.countDocuments({}),
        SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).select("draft.revision published.revision draft.mappings published.mappings").lean(),
      ]);
      const draftBefore = (governance as any)?.draft?.mappings || [];
      const publishedBefore = (governance as any)?.published?.mappings || [];
      console.log(JSON.stringify({
        mode: "dry-run",
        legacyFunctions,
        canonicalFunctions,
        companiesToScan: companyCount,
        governance: {
          draftWouldChange: JSON.stringify(canonicalizeGovernanceMappings(draftBefore)) !== JSON.stringify(draftBefore),
          publishedWouldChange: JSON.stringify(canonicalizeGovernanceMappings(publishedBefore)) !== JSON.stringify(publishedBefore),
        },
      }, null, 2));
      return;
    }
    const buyer = await resolveCanonicalFunction(ROLE_MIGRATIONS[0]);
    const seller = await resolveCanonicalFunction(ROLE_MIGRATIONS[1]);
    const buyerId = String(buyer.canonical._id);
    const sellerId = String(seller.canonical._id);

    const companies = await AssociateCompanyModel.find({})
      .select("_id providedCapabilities soughtCapabilities providedCapabilityPriorities soughtCapabilityPriorities")
      .lean();

    for (const company of companies as any[]) {
      const migrated = migrateBuyerSellerProfile(company, {
        legacyBuyerIds: buyer.legacyIds,
        legacySellerIds: seller.legacyIds,
        buyerId,
        sellerId,
        hasSeparateLegacyBuyer: buyer.legacy.length > 0,
        hasSeparateLegacySeller: seller.legacy.length > 0,
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

    for (const legacy of buyer.legacy) await mergeLegacyFunctionReferences(String(legacy._id), buyerId);
    for (const legacy of seller.legacy) await mergeLegacyFunctionReferences(String(legacy._id), sellerId);
    await migrateSidebarGovernance();
    if (buyer.legacy.length) await CompanyFunctionModel.deleteMany({ _id: { $in: buyer.legacy.map((row) => row._id) } });
    if (seller.legacy.length) await CompanyFunctionModel.deleteMany({ _id: { $in: seller.legacy.map((row) => row._id) } });

    console.log(JSON.stringify({ mode: "apply", companiesMigrated: companies.length, buyerLegacyRowsRemoved: buyer.legacy.length, sellerLegacyRowsRemoved: seller.legacy.length }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Failed to migrate Buyer/Seller taxonomy:", error);
  process.exitCode = 1;
});

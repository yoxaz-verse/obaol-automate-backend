import { VariantRateModel } from "../database/models/variantRate";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CategoryModel } from "../database/models/category";
import { SubCategoryModel } from "../database/models/subCategory";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";
import { liveFreshnessCondition, listingFreshnessCutoff } from "./variantRateFreshnessService";

export type MarketplaceBlockCode =
  | "LISTING_DELETED"
  | "DEMO_LISTING"
  | "LISTING_NOT_APPROVED"
  | "CATALOG_NOT_APPROVED"
  | "OWNER_NOT_APPROVED"
  | "OWNER_INACTIVE"
  | "OWNER_NOT_VERIFIED"
  | "COMPANY_NOT_APPROVED"
  | "NOT_LIVE"
  | "LISTING_EXPIRED";

export type MarketplaceEligibility = {
  marketplaceVisible: boolean;
  marketplaceBlockCode: MarketplaceBlockCode | null;
  marketplaceBlockReason: string | null;
  marketplaceBlockingEntity?: { entityType: string; id?: string; status?: string } | null;
};

const approvedStatus = { $in: ["APPROVED", null] };

export const eligibleMarketplaceVariantIds = async () => {
  const categoryIds = await CategoryModel.find({ approvalStatus: approvedStatus }).distinct("_id");
  const subCategoryIds = await SubCategoryModel.find({ category: { $in: categoryIds }, approvalStatus: approvedStatus }).distinct("_id");
  const productIds = await ProductModel.find({
    subCategory: { $in: subCategoryIds }, approvalStatus: approvedStatus, isDeleted: { $ne: true },
  }).distinct("_id");
  return ProductVariantModel.find({
    product: { $in: productIds }, approvalStatus: approvedStatus, isDeleted: { $ne: true }, isAvailable: { $ne: false },
  }).distinct("_id");
};

export const marketplaceEligibilityQuery = async (options: { requireLive?: boolean; now?: Date } = {}) => {
  const [variantIds, associateIds, companyIds] = await Promise.all([
    eligibleMarketplaceVariantIds(),
    AssociateModel.find({
      registrationStatus: "APPROVED",
      isActive: true,
      isDeleted: { $ne: true },
      isCompanyVerified: true,
    }).distinct("_id"),
    AssociateCompanyModel.find({
      registrationStatus: "APPROVED",
      isApproved: true,
      isDeleted: { $ne: true },
    }).distinct("_id"),
  ]);

  const query: any = {
    isDeleted: { $ne: true },
    isDemo: { $ne: true },
    approvalStatus: approvedStatus,
    productVariant: { $in: variantIds },
    associate: { $in: associateIds },
    associateCompany: { $in: companyIds },
  };
  if (options.requireLive) {
    query.$and = [{ isLive: true }, liveFreshnessCondition(options.now)];
  }
  return query;
};

const blocked = (
  code: MarketplaceBlockCode,
  reason: string,
  entityType: string,
  source?: any,
): MarketplaceEligibility => ({
  marketplaceVisible: false,
  marketplaceBlockCode: code,
  marketplaceBlockReason: reason,
  marketplaceBlockingEntity: {
    entityType,
    ...(source?._id && { id: String(source._id) }),
    ...(source?.approvalStatus && { status: String(source.approvalStatus) }),
  },
});

export const evaluateVariantRateMarketplaceEligibility = async (
  rateOrId: any,
  options: { requireLive?: boolean; now?: Date } = {},
): Promise<MarketplaceEligibility> => {
  const rate: any = typeof rateOrId === "object" && rateOrId?._id
    ? rateOrId
    : await VariantRateModel.findById(rateOrId).lean();
  if (!rate || rate.isDeleted) return blocked("LISTING_DELETED", "The listing is deleted.", "variantRate", rate);
  if (rate.isDemo) return blocked("DEMO_LISTING", "Demo listings are not published to associates.", "variantRate", rate);
  if (String(rate.approvalStatus || "APPROVED") !== "APPROVED") {
    return blocked("LISTING_NOT_APPROVED", "The listing must be approved before it can be published.", "variantRate", rate);
  }

  const variant: any = await ProductVariantModel.findById(rate.productVariant?._id || rate.productVariant)
    .select("_id product approvalStatus isDeleted isAvailable")
    .lean();
  const product: any = variant
    ? await ProductModel.findById(variant.product).select("_id subCategory approvalStatus isDeleted").lean()
    : null;
  const subCategory: any = product
    ? await SubCategoryModel.findById(product.subCategory).select("_id category approvalStatus").lean()
    : null;
  const category: any = subCategory
    ? await CategoryModel.findById(subCategory.category).select("_id approvalStatus").lean()
    : null;
  const catalogChain = [
    { entityType: "category", row: category },
    { entityType: "subCategory", row: subCategory },
    { entityType: "product", row: product },
    { entityType: "productVariant", row: variant },
  ];
  const blockedCatalog = catalogChain.find(({ row }) =>
    !row || row.isDeleted || row.isAvailable === false || String(row.approvalStatus || "APPROVED") !== "APPROVED"
  );
  if (blockedCatalog) {
    const status = !blockedCatalog.row
      ? "MISSING"
      : blockedCatalog.row.isDeleted
        ? "DELETED"
        : blockedCatalog.row.isAvailable === false
          ? "UNAVAILABLE"
          : String(blockedCatalog.row.approvalStatus || "APPROVED");
    return blocked(
      "CATALOG_NOT_APPROVED",
      `The ${blockedCatalog.entityType} is ${status.toLowerCase()} and blocks marketplace publication.`,
      blockedCatalog.entityType,
      { ...(blockedCatalog.row || {}), approvalStatus: status },
    );
  }

  const [associate, company]: any[] = await Promise.all([
    AssociateModel.findById(rate.associate?._id || rate.associate)
      .select("_id registrationStatus isActive isDeleted isCompanyVerified")
      .lean(),
    AssociateCompanyModel.findById(rate.associateCompany?._id || rate.associateCompany)
      .select("_id registrationStatus isApproved isDeleted")
      .lean(),
  ]);
  if (!associate || associate.isDeleted || String(associate.registrationStatus) !== "APPROVED") {
    return blocked("OWNER_NOT_APPROVED", "The listing owner is not approved.", "associate", associate);
  }
  if (!associate.isActive) return blocked("OWNER_INACTIVE", "The listing owner is inactive.", "associate", associate);
  if (!associate.isCompanyVerified) return blocked("OWNER_NOT_VERIFIED", "The listing owner's company verification is incomplete.", "associate", associate);
  if (!company || company.isDeleted || !company.isApproved || String(company.registrationStatus) !== "APPROVED") {
    return blocked("COMPANY_NOT_APPROVED", "The listing company is not approved.", "associateCompany", company);
  }

  if (options.requireLive !== false) {
    if (!rate.isLive || rate.unpublishedAt) return blocked("NOT_LIVE", "The listing is not live.", "variantRate", rate);
    const liveDate = new Date(rate.lastLiveDate || rate.updatedAt || rate.createdAt).getTime();
    if (!Number.isFinite(liveDate) || liveDate <= listingFreshnessCutoff(options.now).getTime()) {
      return blocked("LISTING_EXPIRED", "The listing has expired and must be renewed.", "variantRate", rate);
    }
  }

  return {
    marketplaceVisible: true,
    marketplaceBlockCode: null,
    marketplaceBlockReason: null,
    marketplaceBlockingEntity: null,
  };
};

export const assertVariantRateMarketplaceEligible = async (
  rateOrId: any,
  options: { requireLive?: boolean; now?: Date } = {},
) => {
  const eligibility = await evaluateVariantRateMarketplaceEligibility(rateOrId, options);
  if (!eligibility.marketplaceVisible) {
    throw Object.assign(new Error(eligibility.marketplaceBlockReason || "This listing cannot be published to the marketplace."), {
      status: 409,
      statusCode: 409,
      code: eligibility.marketplaceBlockCode,
      marketplaceBlockCode: eligibility.marketplaceBlockCode,
      marketplaceBlockingEntity: eligibility.marketplaceBlockingEntity,
    });
  }
  return eligibility;
};

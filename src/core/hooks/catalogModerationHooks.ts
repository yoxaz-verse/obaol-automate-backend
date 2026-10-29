import { CategoryModel } from "../../database/models/category";
import { SubCategoryModel } from "../../database/models/subCategory";
import { ProductModel } from "../../database/models/product";
import { ProductVariantModel } from "../../database/models/productVariant";
import { AssociateModel } from "../../database/models/associate";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { ExecutionMode, HookFunction } from "../types";
import { assertAccessibleParent, eligibleApprovedVariantIds, getApprovedAssociateContext, getEnquiryEligibleVariantRateFilter } from "../../services/catalogModeration.service";

const entityField = (entity: string) => ({
  categories: null, "sub-categories": "category", products: "subCategory", "product-variants": "product",
} as Record<string, string | null>)[entity];

const addAnd = (query: any, condition: any) => {
  const filters = { ...(query || {}) };
  const controls: Record<string, any> = {};
  for (const key of ["page", "limit", "sort", "search", "_ts", "view"]) {
    if (Object.prototype.hasOwnProperty.call(filters, key)) {
      controls[key] = filters[key];
      delete filters[key];
    }
  }
  if (!Object.keys(filters).length) return { ...controls, ...condition };
  if (Array.isArray(filters.$and)) {
    return { ...controls, ...filters, $and: [...filters.$and, condition] };
  }
  return { ...controls, $and: [filters, condition] };
};

export const catalogModerationPreReadHook: HookFunction = async (query, _mode, _id, req) => {
  const role = String(req?.user?.role || "").toLowerCase();
  if (role === "admin") return query;
  const approved = { approvalStatus: { $in: ["APPROVED", null] } };
  if (role === "associate" && req?.user?.id) {
    return addAnd(query, { $or: [approved, { createdByAssociate: req.user.id }] });
  }
  return addAnd(query, approved);
};

export const catalogModerationPreWriteHook: HookFunction = async (payload, mode, id, req) => {
  const role = String(req?.user?.role || "").toLowerCase();
  if (role === "admin") {
    if (mode === ExecutionMode.DELETE && String(req?.params?.entity || "").toLowerCase() === "sub-categories") {
      const subCategory = await SubCategoryModel.findOne({ _id: id, isDeleted: { $ne: true } }).select("_id").lean();
      if (!subCategory) {
        const err: any = new Error("Subcategory was not found.");
        err.status = 404; err.statusCode = 404; throw err;
      }
      const hasActiveProducts = await ProductModel.exists({ subCategory: id, isDeleted: { $ne: true } });
      if (hasActiveProducts) {
        const err: any = new Error("Delete the products in this subcategory before deleting the subcategory.");
        err.status = 409; err.statusCode = 409; throw err;
      }
    }
    if (mode === ExecutionMode.CREATE) return { ...payload, approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: req.user?.id };
    return payload;
  }
  if (role === "associate") {
    const err: any = new Error("Use the catalog proposal workflow to create or change directory entries.");
    err.status = 403; err.statusCode = 403; throw err;
  }
  const err: any = new Error("Only admins and approved Associates can manage commodity directory entries.");
  err.status = 403; err.statusCode = 403; throw err;
};

export const variantRateModerationPreReadHook: HookFunction = async (query, _mode, _id, req) => {
  const role = String(req?.user?.role || "").toLowerCase();
  const isMarketplace = String(req?.query?.view || "").toLowerCase() === "marketplace";
  if (isMarketplace && (req?.query?.isLive === true || String(req?.query?.isLive).toLowerCase() === "true")) {
    return addAnd(query, await getEnquiryEligibleVariantRateFilter({ requireLive: true }));
  }
  if (role === "admin") return query;
  if (isMarketplace) return query;
  if (!isMarketplace && role === "associate") {
    const variantIds = await eligibleApprovedVariantIds();
    return addAnd(query, { $or: [
      { associate: req.user?.id },
      { approvalStatus: { $in: ["APPROVED", null] }, productVariant: { $in: variantIds } },
    ] });
  }
  const variantIds = await eligibleApprovedVariantIds();
  const approvedAssociates = await AssociateModel.find({
    registrationStatus: "APPROVED", isActive: true, isDeleted: { $ne: true }, isCompanyVerified: true,
  }).distinct("_id");
  const approvedCompanies = await AssociateCompanyModel.find({
    registrationStatus: "APPROVED", isApproved: true, isDeleted: { $ne: true },
  }).distinct("_id");
  return addAnd(query, {
    approvalStatus: { $in: ["APPROVED", null] }, productVariant: { $in: variantIds }, associate: { $in: approvedAssociates }, associateCompany: { $in: approvedCompanies },
  });
};

export const associateVariantRateModerationPreWriteHook: HookFunction = async (payload, mode, id, req) => {
  if (String(req?.user?.role || "").toLowerCase() !== "associate") return payload;
  if (mode === ExecutionMode.CREATE) {
    const context = await getApprovedAssociateContext(String(req.user?.id || ""));
    // Associates may prepare and activate a private listing on their own pending
    // hierarchy. Marketplace reads still require the complete approved chain.
    await assertAccessibleParent("variantRate", payload, String(context.associateId));
    return {
      ...payload,
      approvalStatus: "APPROVED",
      approvalRequestedAt: null,
      approvedAt: new Date(),
      approvedBy: null,
      reviewNotes: "",
      createdByAssociate: context.associateId,
      createdByCompany: context.companyId,
    };
  }
  // Publication status belongs to the listing owner and does not revise the
  // approved catalog data. Ownership is checked by the preceding hook, while
  // the listing lock separately guarantees this is the only mutable field.
  if (
    mode === ExecutionMode.UPDATE &&
    Object.keys(payload || {}).length === 1 &&
    Object.prototype.hasOwnProperty.call(payload || {}, "isLive")
  ) {
    const isLive = payload.isLive === true || String(payload.isLive).toLowerCase() === "true";
    return { ...payload, isLive };
  }
  const err: any = new Error("Use the catalog proposal workflow to revise an Associate listing.");
  err.status = 403; err.statusCode = 403; throw err;
};


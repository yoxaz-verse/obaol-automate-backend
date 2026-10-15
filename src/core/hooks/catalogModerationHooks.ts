import { CategoryModel } from "../../database/models/category";
import { SubCategoryModel } from "../../database/models/subCategory";
import { ProductModel } from "../../database/models/product";
import { ProductVariantModel } from "../../database/models/productVariant";
import { AssociateModel } from "../../database/models/associate";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { ExecutionMode, HookFunction } from "../types";
import { assertAccessibleParent, getApprovedAssociateContext } from "../../services/catalogModeration.service";
import { AdminModel } from "../../database/models/admin";
import { NotificationModel } from "../../database/models/notification";
import { marketplaceEligibilityQuery } from "../../services/variantRateMarketplaceEligibilityService";

const entityField = (entity: string) => ({
  categories: null, "sub-categories": "category", products: "subCategory", "product-variants": "product",
} as Record<string, string | null>)[entity];

const addAnd = (query: any, condition: any) => Object.keys(query || {}).length ? { $and: [query, condition] } : condition;

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

export const eligibleApprovedVariantIds = async () => {
  const categoryIds = (await CategoryModel.find({ approvalStatus: { $in: ["APPROVED", null] } }).distinct("_id"));
  const subCategoryIds = (await SubCategoryModel.find({ category: { $in: categoryIds }, approvalStatus: { $in: ["APPROVED", null] } }).distinct("_id"));
  const productIds = (await ProductModel.find({ subCategory: { $in: subCategoryIds }, approvalStatus: { $in: ["APPROVED", null] }, isDeleted: { $ne: true } }).distinct("_id"));
  return ProductVariantModel.find({ product: { $in: productIds }, approvalStatus: { $in: ["APPROVED", null] }, isDeleted: { $ne: true }, isAvailable: { $ne: false } }).distinct("_id");
};

export const variantRateModerationPreReadHook: HookFunction = async (query, _mode, _id, req) => {
  const role = String(req?.user?.role || "").toLowerCase();
  if (role === "admin") return query;
  const isMarketplace = String(req?.query?.view || "").toLowerCase() === "marketplace";
  if (!isMarketplace && role === "associate") {
    return addAnd(query, { $or: [{ approvalStatus: { $in: ["APPROVED", null] } }, { associate: req.user?.id }] });
  }
  return addAnd(query, await marketplaceEligibilityQuery({
    requireLive: req?.__marketplaceIsLive === true,
  }));
};

export const associateVariantRateModerationPreWriteHook: HookFunction = async (payload, mode, id, req) => {
  if (String(req?.user?.role || "").toLowerCase() !== "associate") return payload;
  if (mode === ExecutionMode.CREATE) {
    const context = await getApprovedAssociateContext(String(req.user?.id || ""));
    await assertAccessibleParent("variantRate", payload, String(context.associateId));
    return { ...payload, approvalStatus: "PENDING_REVIEW", approvalRequestedAt: new Date(), approvedAt: null, approvedBy: null, reviewNotes: "", createdByAssociate: context.associateId, createdByCompany: context.companyId };
  }
  const err: any = new Error("Use the catalog proposal workflow to revise an Associate listing.");
  err.status = 403; err.statusCode = 403; throw err;
};

export const variantRateModerationPostWriteHook = async (_entity: any, result: any, mode: any, req: any) => {
  if (mode !== ExecutionMode.CREATE || String(req?.user?.role || "").toLowerCase() !== "associate" || !result?._id) return result;
  const admins = await AdminModel.find({ isActive: true, isDeleted: { $ne: true } }).select("_id").lean();
  if (admins.length) await NotificationModel.insertMany(admins.map((admin: any) => ({
    recipientUserId: admin._id, recipientRole: "Admin", type: "APPROVAL_REQUESTED",
    title: "Listing approval requested", message: "An Associate submitted a commodity listing for review.",
    entityType: "APPROVAL", entityId: result._id, route: "/dashboard/approvals", priority: "high",
    payload: { catalogEntityType: "variantRate" },
  })));
  return result;
};

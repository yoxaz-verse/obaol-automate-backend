import mongoose, { Model } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CategoryModel } from "../database/models/category";
import { SubCategoryModel } from "../database/models/subCategory";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";
import { VariantRateModel } from "../database/models/variantRate";

export type ModeratedEntityType = "category" | "subCategory" | "product" | "productVariant" | "variantRate";

export const MODERATED_ENTITY_MODELS: Record<ModeratedEntityType, Model<any>> = {
  category: CategoryModel,
  subCategory: SubCategoryModel,
  product: ProductModel,
  productVariant: ProductVariantModel,
  variantRate: VariantRateModel,
};

export const MODERATED_ENTITY_FIELDS: Record<ModeratedEntityType, string[]> = {
  category: ["name", "description"],
  subCategory: ["name", "description", "category"],
  product: ["name", "description", "subCategory", "state"],
  productVariant: ["name", "description", "product", "isAvailable"],
  variantRate: [
    "rate", "productVariant", "duration", "unit", "locationSource", "warehouseId", "officeAddress",
    "state", "district", "division", "pincodeEntry", "tags", "isLive", "isConventional", "isNatural",
    "isOrganic", "isIpmQuality", "isOrganicCertified", "organicCertificationBody",
    "organicCertificationBodyOther", "organicCertificateNumber", "organicCertificateValidFrom",
    "organicCertificateValidTo", "organicCertifiedQuantity", "organicCertifiedQuantityUnit",
    "organicCertificationScope", "organicCertificateDocumentUrl", "isGiTagged", "giName",
    "giCertificateNumber", "giDocumentUrl",
  ],
};

export const normalizeCatalogName = (value: unknown) =>
  String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en");

export const pickEntityFields = (entityType: ModeratedEntityType, input: any) =>
  Object.fromEntries(MODERATED_ENTITY_FIELDS[entityType]
    .filter((key) => Object.prototype.hasOwnProperty.call(input || {}, key))
    .map((key) => [key, input[key]]));

export const getApprovedAssociateContext = async (associateId: string) => {
  if (!mongoose.Types.ObjectId.isValid(associateId)) throw Object.assign(new Error("Invalid Associate session."), { status: 401 });
  const associate = await AssociateModel.findById(associateId)
    .select("_id associateCompany registrationStatus isActive isDeleted isCompanyVerified")
    .lean();
  if (!associate || (associate as any).isDeleted || !(associate as any).isActive || String((associate as any).registrationStatus) !== "APPROVED") {
    throw Object.assign(new Error("Only approved, active Associates can propose catalog entries."), { status: 403 });
  }
  const companyId = String((associate as any).associateCompany || "");
  const company = companyId
    ? await AssociateCompanyModel.findById(companyId).select("_id registrationStatus isApproved isDeleted").lean()
    : null;
  if (!company || (company as any).isDeleted || !(company as any).isApproved || String((company as any).registrationStatus) !== "APPROVED" || !(associate as any).isCompanyVerified) {
    throw Object.assign(new Error("An approved, verified company is required to propose catalog entries."), { status: 403 });
  }
  return { associate, company, associateId: (associate as any)._id, companyId: (company as any)._id };
};

export const getParent = async (entityType: ModeratedEntityType, payload: any) => {
  if (entityType === "category") return null;
  if (entityType === "subCategory") return { type: "category" as ModeratedEntityType, id: payload.category };
  if (entityType === "product") return { type: "subCategory" as ModeratedEntityType, id: payload.subCategory };
  if (entityType === "productVariant") return { type: "product" as ModeratedEntityType, id: payload.product };
  return { type: "productVariant" as ModeratedEntityType, id: payload.productVariant };
};

export const assertAccessibleParent = async (entityType: ModeratedEntityType, payload: any, associateId: string) => {
  const parent = await getParent(entityType, payload);
  if (!parent) return null;
  if (!parent?.id || !mongoose.Types.ObjectId.isValid(String(parent.id))) {
    throw Object.assign(new Error(`A valid ${parent?.type || "parent"} is required.`), { status: 400 });
  }
  const row = await MODERATED_ENTITY_MODELS[parent.type].findById(parent.id)
    .select("_id approvalStatus createdByAssociate isDeleted").lean();
  if (!row || (row as any).isDeleted) throw Object.assign(new Error(`${parent.type} was not found.`), { status: 404 });
  const status = String((row as any).approvalStatus || "APPROVED");
  if (status !== "APPROVED" && String((row as any).createdByAssociate || "") !== associateId) {
    throw Object.assign(new Error(`You cannot build on another Associate's unapproved ${parent.type}.`), { status: 403 });
  }
  return row;
};

export const assertNoDuplicate = async (entityType: ModeratedEntityType, payload: any, excludeId?: string) => {
  if (entityType === "variantRate") return;
  const name = normalizeCatalogName(payload.name);
  if (!name) throw Object.assign(new Error("Name is required."), { status: 400 });
  const parent = await getParent(entityType, payload);
  const parentField = parent ? ({ subCategory: "category", product: "subCategory", productVariant: "product" } as any)[entityType] : null;
  const query: any = { isDeleted: { $ne: true } };
  if (parentField) query[parentField] = parent!.id;
  if (excludeId) query._id = { $ne: excludeId };
  const rows = await MODERATED_ENTITY_MODELS[entityType].find(query).select("_id name approvalStatus createdByAssociate").lean();
  const duplicate = rows.find((row: any) => normalizeCatalogName(row.name) === name);
  if (duplicate) {
    const error: any = new Error("A catalog entry with this name already exists under the selected parent.");
    error.status = 409;
    error.existing = duplicate;
    throw error;
  }
};

export const getCatalogChain = async (entityType: ModeratedEntityType, source: any) => {
  let variant: any = null; let product: any = null; let subCategory: any = null; let category: any = null;
  if (entityType === "variantRate") variant = await ProductVariantModel.findById(source.productVariant).lean();
  else if (entityType === "productVariant") variant = source;
  if (variant) product = await ProductModel.findById(variant.product).lean();
  else if (entityType === "product") product = source;
  if (product) subCategory = await SubCategoryModel.findById(product.subCategory).lean();
  else if (entityType === "subCategory") subCategory = source;
  if (subCategory) category = await CategoryModel.findById(subCategory.category).lean();
  else if (entityType === "category") category = source;
  return { category, subCategory, product, productVariant: variant };
};

export const catalogModerationSummary = async (entityType: ModeratedEntityType, source: any) => {
  const chain = await getCatalogChain(entityType, source);
  const order = ["category", "subCategory", "product", "productVariant"] as const;
  let blockingAncestor: any = null;
  for (const key of order) {
    const row: any = chain[key];
    if (row && String(row.approvalStatus || "APPROVED") !== "APPROVED") {
      blockingAncestor = { entityType: key, id: row._id, name: row.name, approvalStatus: row.approvalStatus || "APPROVED" };
      break;
    }
  }
  const ownStatus = String(source.approvalStatus || "APPROVED");
  return {
    approvalStatus: ownStatus,
    effectiveVisibility: ownStatus === "APPROVED" && !blockingAncestor,
    blockingAncestor,
    reviewNotes: source.reviewNotes || "",
  };
};

export const assertVariantRateEligible = async (rateOrId: any, options: { requireLive?: boolean } = {}) => {
  const rate: any = typeof rateOrId === "object" && rateOrId?._id
    ? rateOrId
    : await VariantRateModel.findById(rateOrId).lean();
  if (!rate || rate.isDeleted || rate.isDemo || (options.requireLive !== false && (!rate.isLive || rate.unpublishedAt)) || String(rate.approvalStatus || "APPROVED") !== "APPROVED") {
    throw Object.assign(new Error("This listing is not approved for Associate use."), { status: 409 });
  }
  const moderation = await catalogModerationSummary("variantRate", rate);
  if (!moderation.effectiveVisibility) {
    throw Object.assign(new Error(`This listing is blocked by an unapproved ${moderation.blockingAncestor?.entityType || "catalog ancestor"}.`), { status: 409, blockingAncestor: moderation.blockingAncestor });
  }
  const associate: any = await AssociateModel.findById(rate.associate).select("registrationStatus isActive isDeleted isCompanyVerified associateCompany").lean();
  const company: any = rate.associateCompany ? await AssociateCompanyModel.findById(rate.associateCompany).select("registrationStatus isApproved isDeleted").lean() : null;
  if (!associate || associate.isDeleted || !associate.isActive || !associate.isCompanyVerified || associate.registrationStatus !== "APPROVED" || !company || company.isDeleted || !company.isApproved || company.registrationStatus !== "APPROVED") {
    throw Object.assign(new Error("This listing's Associate or company is not currently eligible."), { status: 409 });
  }
  return rate;
};

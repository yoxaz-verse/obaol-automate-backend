import { SubCategoryModel } from "../../database/models/subCategory";
import { ProductModel } from "../../database/models/product";
import { ProductVariantModel } from "../../database/models/productVariant";
import { VariantRateModel } from "../../database/models/variantRate";

const normalizeClassifications = (...values: any[]): string[] => Array.from(new Set(
  values.flatMap((value) => Array.isArray(value) ? value : [value])
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim().toLowerCase()).filter(Boolean)
));

const classificationConditions = (labels: string[]): any[] => {
  const conditions: any[] = [];
  labels.forEach((label) => {
  if (label === "natural") conditions.push({ isNatural: true, isOrganic: { $ne: true }, isIpmQuality: { $ne: true } });
  else if (label === "organic") conditions.push({ isOrganic: true, isIpmQuality: { $ne: true } });
  else if (["ipm", "ipm-quality", "ipm_quality", "ipmquality"].includes(label)) conditions.push({ isIpmQuality: true });
  else if (["gi", "gitag", "gi_tag", "gi-tag"].includes(label)) conditions.push({ isGiTagged: true });
  else if (label === "conventional") conditions.push({ $or: [
    { isConventional: true },
    { $and: [
      { $or: [{ isNatural: { $exists: false } }, { isNatural: false }] },
      { $or: [{ isOrganic: { $exists: false } }, { isOrganic: false }] },
      { $or: [{ isIpmQuality: { $exists: false } }, { isIpmQuality: false }] },
    ] },
  ] });
  });
  return conditions;
};

/** Translate hierarchy and classification filters to each rate-backed entity's relation field. */
export const categoryFilterHook = async (query: any, _mode: string, _id: string | undefined, req: any): Promise<any> => {
  const { category, subCategory, product, classification, classifications, ...restQuery } = query || {};
  const labels = normalizeClassifications(classification, classifications);
  if (!category && !subCategory && !product && labels.length === 0) return query;

  try {
    let productIds: any[] | null = null;
    if (product) productIds = Array.isArray(product) ? product : [product];
    else if (subCategory) {
      const ids = Array.isArray(subCategory) ? subCategory : [subCategory];
      productIds = (await ProductModel.find({ subCategory: { $in: ids } }).select("_id")).map((row) => row._id);
    } else if (category) {
      const ids = Array.isArray(category) ? category : [category];
      const subCategoryIds = (await SubCategoryModel.find({ category: { $in: ids } }).select("_id")).map((row) => row._id);
      productIds = (await ProductModel.find({ subCategory: { $in: subCategoryIds } }).select("_id")).map((row) => row._id);
    }

    let variantIds: any[] | null = null;
    if (productIds) variantIds = (await ProductVariantModel.find({ product: { $in: productIds } }).select("_id")).map((row) => row._id);

    const rateQuery: any = {};
    if (variantIds) rateQuery.productVariant = { $in: variantIds };
    const conditions = classificationConditions(labels);
    if (conditions.length === 1) Object.assign(rateQuery, conditions[0]);
    else if (conditions.length > 1) rateQuery.$or = conditions;

    const entity = req?.params?.entity;
    if (entity === "variant-rates") return { ...restQuery, ...rateQuery };

    const rateIds = (await VariantRateModel.find(rateQuery).select("_id")).map((row) => row._id);
    if (entity === "catalog-items") return { ...restQuery, baseRateId: { $in: rateIds } };
    if (entity === "displayed-rates") return { ...restQuery, variantRate: { $in: rateIds } };
    return { ...restQuery, productVariant: { $in: variantIds || [] } };
  } catch (error) {
    console.error("Error in categoryFilterHook:", error);
    const entity = req?.params?.entity;
    const filterField = entity === "catalog-items" ? "baseRateId" : entity === "displayed-rates" ? "variantRate" : "productVariant";
    return { ...restQuery, [filterField]: { $in: ["000000000000000000000000"] } };
  }
};

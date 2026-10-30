import { Model } from "mongoose";
import { CategoryModel } from "../database/models/category";
import { SubCategoryModel } from "../database/models/subCategory";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";

type Pagination = { page: number; limit: number };

type PublicationBlocker = {
  entityType: "category" | "subCategory" | "product" | "productVariant" | "variantRate";
  id: unknown;
  name: string;
  approvalStatus: string;
  reviewNotes: string;
};

const idOf = (value: any) => String(value?._id || value || "");
const isApproved = (row: any) => String(row?.approvalStatus || "APPROVED") === "APPROVED";

/**
 * Adds the seller-facing publication state in four batched hierarchy reads.
 * Marketplace eligibility continues to be enforced by catalogModeration.service;
 * this is the explanatory counterpart for management screens.
 */
export const addProductTablePublicationMetadata = async (rows: any[]) => {
  if (!rows.length) return rows;

  const variantIds = [...new Set(rows.map((row) => idOf(row.productVariant)).filter(Boolean))];
  const variants: any[] = await ProductVariantModel.find({ _id: { $in: variantIds } })
    .select("_id name product approvalStatus reviewNotes")
    .lean();
  const products: any[] = await ProductModel.find({ _id: { $in: variants.map((row) => row.product) } })
    .select("_id name subCategory approvalStatus reviewNotes")
    .lean();
  const subCategories: any[] = await SubCategoryModel.find({ _id: { $in: products.map((row) => row.subCategory) } })
    .select("_id name category approvalStatus reviewNotes")
    .lean();
  const categories: any[] = await CategoryModel.find({ _id: { $in: subCategories.map((row) => row.category) } })
    .select("_id name approvalStatus reviewNotes")
    .lean();

  const variantById = new Map(variants.map((row) => [idOf(row), row]));
  const productById = new Map(products.map((row) => [idOf(row), row]));
  const subCategoryById = new Map(subCategories.map((row) => [idOf(row), row]));
  const categoryById = new Map(categories.map((row) => [idOf(row), row]));

  return rows.map((source) => {
    const row = typeof source?.toObject === "function" ? source.toObject() : { ...source };
    const productVariant = variantById.get(idOf(row.productVariant));
    const product = productById.get(idOf(productVariant?.product));
    const subCategory = subCategoryById.get(idOf(product?.subCategory));
    const category = categoryById.get(idOf(subCategory?.category));
    const hierarchy = [
      ["category", category],
      ["subCategory", subCategory],
      ["product", product],
      ["productVariant", productVariant],
      ["variantRate", row],
    ] as const;
    const blocked = hierarchy.find(([, entity]) => entity && !isApproved(entity));
    const publicationBlocker: PublicationBlocker | null = blocked
      ? {
          entityType: blocked[0],
          id: blocked[1]._id,
          name: blocked[0] === "variantRate" ? String(productVariant?.name || "Listing") : String(blocked[1].name || "Catalog entry"),
          approvalStatus: String(blocked[1].approvalStatus || "APPROVED"),
          reviewNotes: String(blocked[1].reviewNotes || ""),
        }
      : null;

    return {
      ...row,
      publiclyVisible: row.isLive === true && !publicationBlocker,
      publicationBlocker,
    };
  });
};

const castFilter = (model: Model<any>, filter: Record<string, any>) => {
  const query: any = model.find(filter);
  query.cast(model);
  return query.getFilter();
};

/**
 * Product management screens show the current record for a seller/product
 * variant, not every historical rate row.  Grouping happens before the live
 * filter so an older live row can never reappear behind a newer offline row.
 */
export const findLatestVariantRatesForProductTable = async (
  model: Model<any>,
  filter: Record<string, any>,
  pagination: Pagination,
  populate?: any,
  select?: string,
  _now = new Date(),
) => {
  const requestedLive = filter.isLive;
  const groupingFilter = { ...filter };
  delete groupingFilter.isLive;

  const page = Math.max(1, Number(pagination.page || 1));
  const limit = Math.max(1, Number(pagination.limit || 10));
  const postGroupMatch =
    requestedLive === true
      ? { __effectiveIsLive: true }
      : requestedLive === false || requestedLive?.$ne === true
        ? { __effectiveIsLive: false }
        : null;

  const pipeline: any[] = [
    { $match: castFilter(model, { ...groupingFilter, isDeleted: { $ne: true } }) },
    {
      $addFields: {
        __effectiveLastLive: {
          $ifNull: ["$lastLiveDate", { $ifNull: ["$updatedAt", "$createdAt"] }],
        },
      },
    },
    {
      $addFields: {
        __effectiveIsLive: {
          $eq: ["$isLive", true],
        },
      },
    },
    { $sort: { __effectiveLastLive: -1, updatedAt: -1, createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: {
          owner: { $ifNull: ["$associateCompany", "$associate"] },
          productVariant: "$productVariant",
        },
        row: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$row" } },
    ...(postGroupMatch ? [{ $match: postGroupMatch }] : []),
    { $sort: { __effectiveLastLive: -1, createdAt: -1, _id: -1 } },
    ...(select
      ? [{
          $project: {
            ...Object.fromEntries(select.split(/\s+/).filter(Boolean).map((field) => [field, 1])),
            __effectiveLastLive: 1,
            __effectiveIsLive: 1,
          },
        }]
      : []),
    {
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        meta: [{ $count: "totalCount" }],
      },
    },
  ];

  const [result] = await model.aggregate(pipeline);
  const rows = result?.data || [];
  const data = populate ? await model.populate(rows, populate) : rows;
  const totalCount = Number(result?.meta?.[0]?.totalCount || 0);

  return {
    data,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
  };
};

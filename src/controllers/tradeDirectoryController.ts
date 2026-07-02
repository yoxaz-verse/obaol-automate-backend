import { Request, Response } from "express";
import { VariantRateModel } from "../database/models/variantRate";

const positiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const eligibleCoveragePipeline = () => [
  {
    $match: {
      isLive: true,
      isDeleted: { $ne: true },
      isDemo: { $ne: true },
      associate: { $ne: null },
      associateCompany: { $ne: null },
    },
  },
  {
    $lookup: {
      from: "associates",
      localField: "associate",
      foreignField: "_id",
      as: "associateDoc",
    },
  },
  { $unwind: "$associateDoc" },
  {
    $match: {
      "associateDoc.registrationStatus": "APPROVED",
      "associateDoc.isActive": true,
      "associateDoc.isDeleted": { $ne: true },
      "associateDoc.isCompanyVerified": true,
    },
  },
  {
    $lookup: {
      from: "associatecompanies",
      localField: "associateCompany",
      foreignField: "_id",
      as: "companyDoc",
    },
  },
  { $unwind: "$companyDoc" },
  {
    $match: {
      "companyDoc.registrationStatus": "APPROVED",
      "companyDoc.isApproved": true,
      "companyDoc.isDeleted": { $ne: true },
    },
  },
  {
    $lookup: {
      from: "productvariants",
      localField: "productVariant",
      foreignField: "_id",
      as: "variantDoc",
    },
  },
  { $unwind: "$variantDoc" },
  {
    $match: {
      "variantDoc.isDeleted": { $ne: true },
      "variantDoc.isAvailable": { $ne: false },
    },
  },
  {
    $lookup: {
      from: "products",
      localField: "variantDoc.product",
      foreignField: "_id",
      as: "productDoc",
    },
  },
  { $unwind: "$productDoc" },
  { $match: { "productDoc.isDeleted": { $ne: true }, "productDoc.slug": { $nin: [null, ""] } } },
  {
    $lookup: {
      from: "subcategories",
      localField: "productDoc.subCategory",
      foreignField: "_id",
      as: "subCategoryDoc",
    },
  },
  { $unwind: { path: "$subCategoryDoc", preserveNullAndEmptyArrays: true } },
] as any[];

export const groupedCommodityStages = () => [
  {
    $group: {
      _id: "$productDoc._id",
      slug: { $first: "$productDoc.slug" },
      name: { $first: "$productDoc.name" },
      description: { $first: "$productDoc.description" },
      subCategory: {
        $first: {
          _id: "$subCategoryDoc._id",
          name: "$subCategoryDoc.name",
        },
      },
      activeListingCount: { $sum: 1 },
      associateIds: { $addToSet: "$associateDoc._id" },
      lastPublishedAt: { $max: { $ifNull: ["$lastLiveDate", "$updatedAt"] } },
    },
  },
  {
    $project: {
      _id: 1,
      slug: 1,
      name: 1,
      description: 1,
      subCategory: 1,
      coverage: {
        activeListingCount: "$activeListingCount",
        activeAssociateCount: { $size: "$associateIds" },
        lastPublishedAt: "$lastPublishedAt",
      },
    },
  },
] as any[];

export const listTradeDirectoryCommodities = async (req: Request, res: Response) => {
  try {
    const page = positiveInt(req.query.page, 1, 100000);
    const limit = positiveInt(req.query.limit, 16, 100);
    const search = String(req.query.q || req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const filters: any[] = [];

    if (search) {
      const matcher = new RegExp(escapeRegex(search), "i");
      filters.push({ $match: { $or: [{ "productDoc.name": matcher }, { "productDoc.description": matcher }] } });
    }
    if (category && category.toLowerCase() !== "all") {
      filters.push({ $match: { "subCategoryDoc.name": new RegExp(`^${escapeRegex(category)}$`, "i") } });
    }

    const [result] = await VariantRateModel.aggregate([
      ...eligibleCoveragePipeline(),
      ...filters,
      ...groupedCommodityStages(),
      { $sort: { name: 1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          count: [{ $count: "total" }],
        },
      },
    ]);

    const total = Number(result?.count?.[0]?.total || 0);
    return res.json({
      success: true,
      data: result?.data || [],
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load the Associate Trade Directory.", error: error?.message });
  }
};

export const getTradeDirectoryCommodity = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug) return res.status(400).json({ success: false, message: "Commodity slug is required." });

    const rows = await VariantRateModel.aggregate([
      ...eligibleCoveragePipeline(),
      { $match: { "productDoc.slug": slug } },
      ...groupedCommodityStages(),
      { $limit: 1 },
    ]);
    const commodity = rows[0];
    if (!commodity) {
      return res.status(404).json({ success: false, message: "No active verified Associate coverage was found for this commodity." });
    }

    const related = await VariantRateModel.aggregate([
      ...eligibleCoveragePipeline(),
      {
        $match: {
          "productDoc.slug": { $ne: slug },
          "productDoc.subCategory": commodity.subCategory?._id,
        },
      },
      ...groupedCommodityStages(),
      { $sort: { name: 1 } },
      { $limit: 6 },
    ]);

    return res.json({ success: true, data: { ...commodity, related } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load the commodity profile.", error: error?.message });
  }
};

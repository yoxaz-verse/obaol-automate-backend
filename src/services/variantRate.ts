import { Request, Response } from "express";
import VariantRateRepository from "../database/repositories/variantRate";
import { logError } from "../utils/errorLogger";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import { ProductVariantModel } from "../database/models/productVariant";
import { ProductModel } from "../database/models/product";
import { SubCategoryModel } from "../database/models/subCategory";
import { Types } from "mongoose";
import { isValidObjectId } from "mongoose";

class VariantRateService {
  private variantRateRepository: VariantRateRepository;

  constructor() {
    this.variantRateRepository = new VariantRateRepository();
  }

  public async getVariantRates(req: Request, res: Response) {
    try {
      // 1) Pagination
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      // 2) Extract & clean filters
      const { page: _, limit: __, ...rawFilters } = req.query;
      const filters = Object.entries(rawFilters).reduce<any>((acc, [k, v]) => {
        if (v != null && v !== "") acc[k] = v;
        return acc;
      }, {});

      // 3) Build base dynamicQuery for simple fields (dates, booleans, IDs, regex)
      let dynamicQuery = buildDynamicQuery(filters);

      // 4) Role‑based visibility
      const userRole = req.user?.role;
      const userId = req.user?.id;
      if (userRole === "Associate") {
        dynamicQuery = {
          $and: [
            dynamicQuery,
            { $or: [{ associate: userId }, { isLive: true }] },
          ],
        };
      } else if (userRole !== "Admin") {
        dynamicQuery.selected = true;
        dynamicQuery.isLive = true;
      }

      // 5) Handle subCategory→ProductVariant and product→ProductVariant mapping
      let variantFilter: any = {}; // for ProductVariantModel

      // a) subCategory filter
      if (filters.subCategory) {
        let subCatId: Types.ObjectId | null = null;

        if (isValidObjectId(filters.subCategory)) {
          // by ID
          subCatId = new Types.ObjectId(filters.subCategory as string);
        } else {
          // by name
          const sc = await SubCategoryModel.findOne({
            name: new RegExp(`^${filters.subCategory}$`, "i"),
          })
            .select("_id")
            .lean();
          if (sc) subCatId = new Types.ObjectId(sc._id);
        }

        if (!subCatId) {
          return res.json({
            data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
            message: "No matching subCategory found",
          });
        }

        // fetch all products under that subCategory
        const prods = await ProductModel.find({ subCategory: subCatId })
          .select("_id")
          .lean<{ _id: Types.ObjectId }[]>();
        const prodIds = prods.map((p) => p._id);
        if (prodIds.length === 0) {
          return res.json({
            data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
            message: "No products in that subCategory",
          });
        }
        variantFilter.product = { $in: prodIds };
      }

      // b) product filter (overrides/combines with subCategory)
      if (filters.product) {
        let prodId: Types.ObjectId | null = null;

        if (isValidObjectId(filters.product)) {
          prodId = new Types.ObjectId(filters.product as string);
        } else {
          const pd = await ProductModel.findOne({
            name: new RegExp(`^${filters.product}$`, "i"),
          })
            .select("_id subCategory")
            .lean<{ _id: Types.ObjectId; subCategory: Types.ObjectId }>();
          if (pd) {
            // if both subCategory and product are provided, ensure they match
            if (
              filters.subCategory &&
              pd.subCategory.toString() !==
                String(variantFilter.product?.["$in"]?.[0]?.toString())
            ) {
              return res.json({
                data: {
                  data: [],
                  totalCount: 0,
                  currentPage: page,
                  totalPages: 0,
                },
                message: "Product does not belong to selected subCategory",
              });
            }
            prodId = pd._id;
          }
        }

        if (!prodId) {
          return res.json({
            data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
            message: "No matching product found",
          });
        }

        variantFilter.product = prodId;
      }

      // c) fetch matching ProductVariant IDs
      if (variantFilter.product) {
        const variants = await ProductVariantModel.find(variantFilter)
          .select("_id")
          .lean<{ _id: Types.ObjectId }[]>();
        const variantIds = variants.map((v) => v._id);
        if (variantIds.length === 0) {
          return res.json({
            data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
            message: "No product variants found matching filters",
          });
        }
        dynamicQuery.productVariant = { $in: variantIds };
      }
      delete dynamicQuery.subCategory;
      delete dynamicQuery.product;
      delete dynamicQuery.category;
      // 6) Final data fetch
      const result = await this.variantRateRepository.getVariantRates(
        req,
        { page, limit },
        dynamicQuery
      );

      return res.json({
        data: result,
        message: "Variant Rates retrieved successfully",
      });
    } catch (err) {
      logError(err, req, "VariantRateService-getVariantRates");
      return res.status(500).json({ error: "Variant Rates retrieval failed." });
    }
  }

  public async getVariantRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const variantRate = await this.variantRateRepository.getVariantRateById(
        req,
        id
      );
      if (!variantRate) {
        res.status(404).json({ error: "Variant Rate not found" });
        return;
      }
      res.json({
        data: variantRate,
        message: "Variant Rate retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "VariantRateService-getVariantRate");
      res.status(500).json({ error: "Variant Rate retrieval failed" });
    }
  }

  public async createVariantRate(req: Request, res: Response) {
    try {
      const variantRateData = req.body;
      // Sanitize optional ObjectId fields
      if (variantRateData.pincodeEntry === "")
        variantRateData.pincodeEntry = undefined;
      if (variantRateData.division === "") variantRateData.division = undefined;
      const newVariantRate = await this.variantRateRepository.createVariantRate(
        req,
        variantRateData
      );
      res.status(201).json({
        data: newVariantRate,
        message: "Variant Rate created successfully",
      });
    } catch (error) {
      logError(error, req, "VariantRateService-createVariantRate");
      res.status(500).json({ error: "Variant Rate creation failed" });
    }
  }

  public async updateVariantRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const variantRateData = req.body;
      const userRole = req.user?.role;
      const existingVariant =
        await this.variantRateRepository.getVariantRateById(req, id);

      if (!existingVariant) {
        return res.status(404).json({ error: "Variant Rate not found" });
      }

      const now = Date.now();
      const lastEditTime = existingVariant.lastEditTime
        ? new Date(existingVariant.lastEditTime).getTime()
        : 0;
      const coolingStartTime = existingVariant.coolingStartTime
        ? new Date(existingVariant.coolingStartTime).getTime()
        : 0;
      const durationMs = (existingVariant.duration ?? 1) * 24 * 60 * 60 * 1000;
      const coolingPeriod = 15 * 60 * 1000;

      const timeSinceLastEdit = now - lastEditTime;
      const timeSinceCooling = now - coolingStartTime;

      let updateAllowed = false;
      let isCoolingEdit = false;

      if (!lastEditTime) {
        updateAllowed = true; // First edit
      } else if (timeSinceCooling <= coolingPeriod) {
        updateAllowed = true;
        isCoolingEdit = true; // Within cooling, allow draft
      } else if (timeSinceLastEdit >= durationMs) {
        updateAllowed = true; // Duration passed, reset cycle
      }

      if (userRole !== "Admin" && !updateAllowed) {
        return res.status(400).json({
          error: "Rate edit not allowed. Wait for the next duration cycle.",
        });
      }

      const updatePayload = {
        ...variantRateData,
        lastEditTime: isCoolingEdit ? existingVariant.lastEditTime : now,
        coolingStartTime: now,
        isLive:
          userRole === "Admin"
            ? variantRateData.isLive
            : isCoolingEdit
            ? false
            : true, // Only live if it's outside cooling
      };

      const updatedVariantRate =
        await this.variantRateRepository.updateVariantRate(
          req,
          id,
          updatePayload
        );

      res.json({
        data: updatedVariantRate,
        message: isCoolingEdit
          ? "Rate updated in draft mode during cooling period."
          : "Rate updated successfully. New duration cycle started.",
      });
    } catch (error) {
      logError(error, req, "VariantRateService-updateVariantRate");
      res.status(500).json({ error: "Variant Rate update failed" });
    }
  }

  public async deleteVariantRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedVariantRate =
        await this.variantRateRepository.deleteVariantRate(req, id);
      if (!deletedVariantRate) {
        res
          .status(404)
          .json({ error: "Variant Rate not found or already deleted" });
        return;
      }
      res.json({
        data: deletedVariantRate,
        message: "Variant Rate deleted successfully",
      });
    } catch (error) {
      logError(error, req, "VariantRateService-deleteVariantRate");
      res.status(500).json({ error: "Variant Rate deletion failed" });
    }
  }
}

export default VariantRateService;

/**
 * Normalizes the passed company name:
 * 1) .trim()
 * 2) .toLowerCase()
 * 3) convert underscores '_' to spaces
 * 4) optionally reduce multiple spaces to one
 *
 * Example:
 *   "   OBAOL_supreme   " => "obaol supreme"
 */

function normalizeCompanyName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/_+/g, " ") // underscores -> space
    .replace(/\s+/g, " "); // reduce multiple spaces to one
}

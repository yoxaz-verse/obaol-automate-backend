import { Request, Response } from "express";
import VariantRateRepository from "../database/repositories/variantRate";
import { logError } from "../utils/errorLogger";
import { IPagination } from "../interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateModel } from "../database/models/associate";
import { ProductVariantModel } from "../database/models/productVariant";
import { ProductModel } from "../database/models/product";
import { SubCategoryModel } from "../database/models/subCategory";
import mongoose, { Types } from "mongoose";
import { CategoryModel } from "../database/models/category";

class VariantRateService {
  private variantRateRepository: VariantRateRepository;

  constructor() {
    this.variantRateRepository = new VariantRateRepository();
  }

public async getVariantRates(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const { page: _, limit: __, ...filters } = req.query;

    // Clean out empty filters
    Object.entries(filters).forEach(([k, v]) => {
      if (v === "" || v == null) delete filters[k];
    });

    let dynamicQuery = buildDynamicQuery(filters as any);

    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === "Associate") {
      dynamicQuery = {
        $and: [
          dynamicQuery,
          { $or: [{ associate: userId }, { isLive: true }] },
          // optionally further constraints
        ],
      };
    } else if (userRole !== "Admin") {
      dynamicQuery.selected = true;
      dynamicQuery.isLive = true;
    }

    // Map name filters to ObjectIds
    const ids: Types.ObjectId[] = [];

    if (filters.subCategory) {
      const subCat = await SubCategoryModel.findOne({
        name: new RegExp(`^${filters.subCategory}$`, "i"),
      }).lean<{ _id: Types.ObjectId }>();
      if (subCat) ids.push(subCat._id);
      else
        return res.json({
          data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
          message: "No matching subCategory found",
        });
    }

    if (filters.product) {
      const prod = await ProductModel.findOne({
        name: new RegExp(`^${filters.product}$`, "i"),
      })
        .lean<{ _id: Types.ObjectId; subCategory: Types.ObjectId }>();
      if (prod) {
        if (
          filters.subCategory &&
          prod.subCategory.toString() !== ids[0]?.toString()
        ) {
          return res.json({
            data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
            message: "Product does not match subCategory",
          });
        }
        ids.push(prod._id);
      } else {
        return res.json({
          data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
          message: "No matching product found",
        });
      }
    }

    // Now treat `ids[0]` as subCategory or `ids[1]` as product
    if (ids.length > 0) {
      const variantQuery: any = {};
      if (ids.length === 2) variantQuery.product = ids[1];
      else variantQuery.subCategory = ids[0];

      const variants = await ProductVariantModel.find(variantQuery)
        .select("_id")
        .lean<{ _id: Types.ObjectId }[]>();

      const variantIds = variants.map((v) => v._id as Types.ObjectId);
      if (variantIds.length === 0) {
        return res.json({
          data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
          message: "No variants found for filter",
        });
      }
      dynamicQuery.productVariant = { $in: variantIds };
    }

    const variantData = await this.variantRateRepository.getVariantRates(
      req,
      { page, limit },
      dynamicQuery
    );
    return res.json({
      data: variantData,
      message: "Variant Rates retrieved successfully",
    });
  } catch (error) {
    logError(error, req, "VariantRateService-getVariantRates");
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

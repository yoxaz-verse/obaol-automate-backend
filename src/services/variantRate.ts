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
import { Types } from "mongoose";

class VariantRateService {
  private variantRateRepository: VariantRateRepository;

  constructor() {
    this.variantRateRepository = new VariantRateRepository();
  }

  public async getVariantRates(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
      };

      const { page, limit, ...filters } = req.query;
      let dynamicQuery = buildDynamicQuery(filters);

      // Clean up dynamicQuery
      delete dynamicQuery.associateId;
      delete dynamicQuery.associateCompanyName;
      delete dynamicQuery.product;
      delete dynamicQuery.subCategory;

      const userRole = req.user?.role;
      const userId = req.user?.id;

      // 1) Associate Company Name Normalization
      if (filters.associateCompanyName) {
        const rawName = filters.associateCompanyName.toString();
        delete filters.associateCompanyName;

        const normalizedName = normalizeCompanyName(rawName);

        const companyDoc = await AssociateCompanyModel.findOne({
          name: new RegExp("^" + normalizedName + "$", "i"),
        });

        if (companyDoc) {
          const foundAssociates = await AssociateModel.find({
            associateCompany: companyDoc._id,
          }).select("_id");
          const matchingIds = foundAssociates.map((a) => a._id);
          dynamicQuery.associate = { $in: matchingIds };
        } else {
          dynamicQuery.associate = { $in: [] };
        }
      }
      // 2) Associate ID
      else if (filters.associateId) {
        const assocId = filters.associateId.toString();
        delete filters.associateId;

        const foundAssoc = await AssociateModel.findById(assocId).select(
          "associateCompany"
        );

        if (foundAssoc) {
          const foundAssociates = await AssociateModel.find({
            associateCompany: foundAssoc.associateCompany,
          }).select("_id");

          const matchingIds = foundAssociates.map((a) => a._id);
          dynamicQuery.associate = { $in: matchingIds };
        } else {
          dynamicQuery.associate = { $in: [] };
        }
      }
      // 3) Role-based logic
      else {
        if (userRole === "Admin") {
          // Admin sees everything
        } else if (userRole === "Associate") {
          dynamicQuery = {
            $and: [
              dynamicQuery,
              {
                $or: [{ associate: userId }, { isLive: true }],
              },
            ],
          };
        } else {
          dynamicQuery.selected = true;
          dynamicQuery.isLive = true;
        }
      }

      // 🔥 New section: Product and SubCategory Normalized Lookup

      let productId: string | null = null;
      let subCategoryId: string | null = null;

      // Handle subCategory first
      if (filters.subCategory) {
        const rawSubCategoryName = filters.subCategory.toString();
        const normalizedSubCategoryName =
          normalizeCompanyName(rawSubCategoryName); // using same normalize function
        const subCategoryDoc = await SubCategoryModel.findOne<{
          _id: Types.ObjectId;
        }>({
          name: new RegExp("^" + normalizedSubCategoryName + "$", "i"),
        }).select("_id");

        if (subCategoryDoc) {
          subCategoryId = subCategoryDoc._id.toString();
        } else {
          dynamicQuery.productVariant = { $in: [] }; // no subCategory found
        }
      }

      // Handle product
      if (filters.product) {
        const rawProductName = filters.product.toString();
        const normalizedProductName = normalizeCompanyName(rawProductName); // reuse
        const productDoc = await ProductModel.findOne<{
          _id: Types.ObjectId;
          subCategory: Types.ObjectId;
        }>({
          name: new RegExp("^" + normalizedProductName + "$", "i"),
        }).select("_id subCategory");

        if (productDoc) {
          productId = productDoc._id.toString();

          // If subCategoryId is also set, make sure the product belongs to that subCategory
          if (
            subCategoryId &&
            productDoc.subCategory.toString() !== subCategoryId
          ) {
            dynamicQuery.productVariant = { $in: [] }; // product not matching subcategory
          }
        } else {
          dynamicQuery.productVariant = { $in: [] }; // no product found
        }
      }

      if (productId || subCategoryId) {
        const productVariantQuery: any = {};

        if (productId) {
          productVariantQuery.product = productId;
        }

        if (subCategoryId && !productVariantQuery.product) {
          // only subCategory filtering needed
          const productsInSubCategory = await ProductModel.find({
            subCategory: subCategoryId,
          }).select("_id");

          const productIdsFromSubCategory = productsInSubCategory.map(
            (p) => p._id
          );

          productVariantQuery.product = { $in: productIdsFromSubCategory };
        }

        if (Object.keys(productVariantQuery).length > 0) {
          const matchingVariants = await ProductVariantModel.find(
            productVariantQuery
          ).select("_id");

          const variantIds = matchingVariants.map((v) => v._id);

          dynamicQuery.productVariant = { $in: variantIds };
        }
      }

      // console.log(
      //   "Final dynamicQuery =>",
      //   JSON.stringify(dynamicQuery, null, 2)
      // );

      const variantRates = await this.variantRateRepository.getVariantRates(
        req,
        pagination,
        dynamicQuery
      );

      return res.json({
        data: variantRates,
        message: "Variant Rates retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "VariantRateService-getVariantRates");
      return res.status(500).json({ error: "Variant Rates retrieval failed" });
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

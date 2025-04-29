import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { IPagination } from "../interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import DisplayedRateRepository from "../database/repositories/displayRate";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import mongoose, { Types } from "mongoose";
import { SubCategoryModel } from "../database/models/subCategory";
import { ProductModel } from "../database/models/product";
import { VariantRateModel } from "../database/models/variantRate";

class DisplayedRateService {
  private displayedRateRepository: DisplayedRateRepository;

  constructor() {
    this.displayedRateRepository = new DisplayedRateRepository();
  }

  public async getDisplayedRates(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
      };

      const { page, limit, ...filters } = req.query;
      let dynamicQuery: any = buildDynamicQuery(filters);

      // --- 1) Associate Company Name Filter ---
      if (filters.associateCompanyName) {
        const rawCompanyName = filters.associateCompanyName.toString();
        delete filters.associateCompanyName;
        const normalizedName = normalizeName(rawCompanyName);

        const companyDoc = await AssociateCompanyModel.findOne({
          name: new RegExp("^" + normalizedName + "$", "i"),
        });

        dynamicQuery.associateCompany = companyDoc
          ? companyDoc._id
          : { $in: [] };
      }

      // --- 2) Associate ID Filter ---
      else if (filters.associateId) {
        const rawAssocId = filters.associateId.toString();
        delete filters.associateId;

        const assocDoc = await AssociateModel.findById(rawAssocId).select(
          "associateCompany"
        );

        dynamicQuery.associateCompany = assocDoc
          ? assocDoc.associateCompany
          : { $in: [] };
      }

      // --- 3) Role-Based Filter ---
      else {
        const userRole = req.user?.role;
        const userId = req.user?.id;

        if (userRole === "Admin") {
          // show all
        } else if (userRole === "Associate" && userId) {
          const userAssocDoc = await AssociateModel.findById(userId).select(
            "associateCompany"
          );
          dynamicQuery.associateCompany = userAssocDoc
            ? userAssocDoc.associateCompany
            : { $in: [] };
        } else {
          dynamicQuery.selected = true;
        }
      }

      // --- 4) Product / SubCategory Filters (Similar to VariantRate) ---
      if (filters.product || filters.subCategory) {
        const productName = filters.product?.toString();
        const subCategoryName = filters.subCategory?.toString();
        delete filters.product;
        delete filters.subCategory;

        let productId: mongoose.Types.ObjectId | null = null;
        let subCategoryId: mongoose.Types.ObjectId | null = null;

        // Normalize and find subCategory
        if (subCategoryName) {
          const normalizedSubCat = normalizeName(subCategoryName);
          const subCatDoc = await SubCategoryModel.findOne<{
            _id: Types.ObjectId;
          }>({
            name: new RegExp("^" + normalizedSubCat + "$", "i"),
          }).select("_id");
          if (subCatDoc) subCategoryId = subCatDoc._id;
        }

        // Normalize and find product
        if (productName) {
          const normalizedProduct = normalizeName(productName);
          const productDoc = await ProductModel.findOne<{
            _id: Types.ObjectId;
            subCategory: Types.ObjectId;
          }>({
            name: new RegExp("^" + normalizedProduct + "$", "i"),
          }).select("_id subCategory");

          if (productDoc) {
            productId = productDoc._id;

            // Check mismatch with subCategory
            if (
              subCategoryId &&
              productDoc.subCategory?.toString() !== subCategoryId.toString()
            ) {
              dynamicQuery.variantRate = { $in: [] };
            }
          }
        }

        // Build final variantRate filter if not forced empty already
        if (!dynamicQuery.variantRate) {
          const variantRateQuery: any = {};
          if (productId) variantRateQuery.product = productId;
          if (subCategoryId) variantRateQuery.subCategory = subCategoryId;

          const matchingVariantRates = await VariantRateModel.find(
            variantRateQuery
          ).select("_id");

          const matchingIds = matchingVariantRates.map((vr) => vr._id);
          dynamicQuery.variantRate = matchingIds.length
            ? { $in: matchingIds }
            : { $in: [] };
        }
      }

      // --- Final Query Execution ---
      const displayedRates =
        await this.displayedRateRepository.getDisplayedRates(
          req,
          pagination,
          dynamicQuery
        );

      res.json({
        data: displayedRates,
        message: "Displayed Rates retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "DisplayedRateService-getDisplayedRates");
      return res
        .status(500)
        .json({ error: "Displayed Rates retrieval failed" });
    }
  }

  public async getDisplayedRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const displayedRate =
        await this.displayedRateRepository.getDisplayedRateById(req, id);
      if (!displayedRate) {
        res.status(404).json({ error: "Displayed Rate not found" });
        return;
      }
      res.json({
        data: displayedRate,
        message: "Displayed Rate retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "displayedRateService-getDisplayedRate");
      res.status(500).json({ error: "Displayed Rate retrieval failed" });
    }
  }

  public async createDisplayedRate(req: Request, res: Response) {
    try {
      const displayedRateData = req.body;
      const newDisplayedRate =
        await this.displayedRateRepository.createDisplayedRate(
          req,
          displayedRateData
        );
      res.status(201).json({
        data: newDisplayedRate,
        message: "Displayed Rate created successfully",
      });
    } catch (error) {
      logError(error, req, "DisplayedRateService-createDisplayedRate");
      res.status(500).json({ error: "Displayed Rate creation failed" });
    }
  }

  public async updateDisplayedRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const variantRateData = req.body;
      const updatedDisplayedRate =
        await this.displayedRateRepository.updateDisplayedRate(
          req,
          id,
          variantRateData
        );
      if (!updatedDisplayedRate) {
        res.status(404).json({ error: "Displayed Rate not found" });
        return;
      }
      res.json({
        data: updatedDisplayedRate,
        message: "Displayed Rate updated successfully",
      });
    } catch (error) {
      logError(error, req, "DisplayedRateService-updateDisplayedRate");
      res.status(500).json({ error: "Displayed Rate update failed" });
    }
  }

  public async deleteDisplayedRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedDisplayedRate =
        await this.displayedRateRepository.deleteDisplayedRate(req, id);
      if (!deletedDisplayedRate) {
        res
          .status(404)
          .json({ error: "Displayed Rate not found or already deleted" });
        return;
      }
      res.json({
        data: deletedDisplayedRate,
        message: "Displayed Rate deleted successfully",
      });
    } catch (error) {
      logError(error, req, "DisplayedRateService-deleteDisplayedRate");
      res.status(500).json({ error: "Displayed Rate deletion failed" });
    }
  }
}

export default DisplayedRateService;

/**
 * Normalizes the company name:
 *  - toLowerCase
 *  - underscores -> spaces
 *  - compress multiple spaces
 */
function normalizeName(input: string): string {
  return input.trim().toLowerCase().replace(/_+/g, " ").replace(/\s+/g, " ");
}

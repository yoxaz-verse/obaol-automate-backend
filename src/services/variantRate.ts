import { Request, Response } from "express";
import VariantRateRepository from "../database/repositories/variantRate";
import { logError } from "../utils/errorLogger";
import { IPagination } from "../interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateModel } from "../database/models/associate";

class VariantRateService {
  private variantRateRepository: VariantRateRepository;

  constructor() {
    this.variantRateRepository = new VariantRateRepository();
  }

  public async getVariantRates(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const { page, limit, ...filters } = req.query;
      let dynamicQuery = buildDynamicQuery(filters);

      console.log(
        "filters.associateCompanyName:",
        filters.associateCompanyName
      );

      // 1) Check if associateCompanyName was passed
      // 1) Check if associateCompanyName was passed
      if (filters.associateCompanyName) {
        // a) Normalize the user input
        const rawName = filters.associateCompanyName.toString();
        // remove from filters so buildDynamicQuery doesn't include it
        delete filters.associateCompanyName;

        const normalizedName = normalizeCompanyName(rawName);
        console.log("normalizedName:", normalizedName);

        // b) Find the company by a case-insensitive match of normalizedName
        const companyDoc = await AssociateCompanyModel.findOne({
          name: new RegExp("^" + normalizedName + "$", "i"),
        });
        console.log("companyDoc:", companyDoc);

        if (companyDoc) {
          // c) find all associates referencing this company
          const matchingAssociates = await AssociateModel.find(
            { associateCompany: companyDoc._id },
            "_id"
          );
          const matchingIds = matchingAssociates.map((assoc) => assoc._id);

          // set variantRate.associate in that set
          dynamicQuery.associate = { $in: matchingIds };
          if (req.user?.role !== "Admin" && req.user?.role !== "Associate")
            dynamicQuery.isLive = true;
        } else {
          // if no matching company => no results
          dynamicQuery.associate = { $in: [] };
        }

        // Because your requirement says: if associateCompanyName is present,
        // we skip the role-based logic. So do nothing here for roles.
      } else {
        // 2) If NO associateCompanyName, do your normal role-based logic
        if (req.user?.role === "Admin") {
          // Admin sees all (no changes needed to dynamicQuery)
        } else if (req.user?.role === "Associate") {
          // Combine with: (associate = user) OR (isLive = true)
          dynamicQuery = {
            $and: [
              dynamicQuery,
              {
                $or: [{ associate: req.user.id }, { isLive: true }],
              },
            ],
          };
        } else {
          // Non-admin, non-associate => only selected = true, isLive = true
          dynamicQuery.selected = true;
          dynamicQuery.isLive = true;
        }
      }
      // 🚨 CRUCIAL: If buildDynamicQuery added "associateCompanyName" as a field, remove it now
      // This ensures the final query doesn't contain associateCompanyName: {...}
      delete dynamicQuery.associateCompanyName;
      console.log("dynamicQuery =>", dynamicQuery);

      // 3) Call the repository
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
      const updatedVariantRate =
        await this.variantRateRepository.updateVariantRate(
          req,
          id,
          variantRateData
        );
      if (!updatedVariantRate) {
        res.status(404).json({ error: "Variant Rate not found" });
        return;
      }
      res.json({
        data: updatedVariantRate,
        message: "Variant Rate updated successfully",
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

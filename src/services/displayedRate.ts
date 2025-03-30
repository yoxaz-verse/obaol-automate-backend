import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { IPagination } from "../interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import DisplayedRateRepository from "../database/repositories/displayRate";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";

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
      let dynamicQuery = buildDynamicQuery(filters);

      // If the user passes ?associateCompanyName=...
      if (filters.associateCompanyName) {
        // 1) Normalize
        const rawCompanyName = filters.associateCompanyName.toString();
        delete filters.associateCompanyName; // so it doesn't end in final query
        const normalizedName = normalizeCompanyName(rawCompanyName);

        // 2) Find company doc by name ignoring case
        const companyDoc = await AssociateCompanyModel.findOne({
          name: new RegExp("^" + normalizedName + "$", "i"),
        });

        if (companyDoc) {
          // Filter displayedRate.associateCompany to that doc._id
          dynamicQuery.associateCompany = companyDoc._id;
        } else {
          // If not found => force empty
          dynamicQuery.associateCompany = { $in: [] };
        }

        // Skip role logic if company name was provided
      }
      // If no associateCompanyName but we do have 'associateId'
      else if (filters.associateId) {
        const rawAssocId = filters.associateId.toString();
        delete filters.associateId; // remove from final query

        // find that Associate doc
        const assocDoc = await AssociateModel.findById(rawAssocId).select(
          "associateCompany"
        );
        if (assocDoc) {
          dynamicQuery.associateCompany = assocDoc.associateCompany;
        } else {
          dynamicQuery.associateCompany = { $in: [] };
        }

        // skip role-based logic if 'associateId' is present
      } else {
        // 3) if neither associateCompanyName nor associateId => do your normal role logic
        const userRole = req.user?.role;
        const userId = req.user?.id;

        if (userRole === "Admin") {
          // Admin sees all displayedRates
        } else if (userRole === "Associate" && userId) {
          // find the user’s company
          const userAssocDoc = await AssociateModel.findById(userId).select(
            "associateCompany"
          );
          if (userAssocDoc) {
            dynamicQuery.associateCompany = userAssocDoc.associateCompany;
          } else {
            dynamicQuery.associateCompany = { $in: [] };
          }
        } else {
          // Non-admin, non-associate => maybe skip or do some other restriction
          // E.g. displayedRate => only selected = true
          dynamicQuery.selected = true;
        }
      }

      console.log("Final displayedRate query =>", dynamicQuery);

      // call your repository
      const displayedRates =
        await this.displayedRateRepository.getDisplayedRates(
          req,
          pagination,
          dynamicQuery
        );
      console.log("displayedRates");
      console.log(displayedRates);

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
function normalizeCompanyName(input: string): string {
  return input.trim().toLowerCase().replace(/_+/g, " ").replace(/\s+/g, " ");
}

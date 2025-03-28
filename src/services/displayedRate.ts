import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { IPagination } from "../interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import DisplayedRateRepository from "../database/repositories/displayRate";

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
      const dynamicQuery = buildDynamicQuery(filters);

      // If the client sends something like ?associateCompanyName= O B A O L
      if (filters.associateCompanyName) {
        // Put it in dynamicQuery so the repository can use it
        dynamicQuery.associateCompanyName = filters.associateCompanyName;
      }

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
      res.status(500).json({ error: "Displayed Rates retrieval failed" });
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

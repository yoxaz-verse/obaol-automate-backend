import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import CompanyStageRepository from "../database/repositories/companyStage";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class CompanyStageService {
  private companyStageRepository: CompanyStageRepository;

  constructor() {
    this.companyStageRepository = new CompanyStageRepository();
  }

  public async getCompanyStages(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.companyStageRepository.getCompanyStages(req, pagination, dynamicQuery);
      res.json({
        message: "CompanyStages retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "CompanyStageService-getCompanyStages");
      res.status(500).send("CompanyStages retrieval failed");
    }
  }

  public async getCompanyStage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.companyStageRepository.getCompanyStageById(req, id);
      if (item) res.json(item);
      else res.status(404).send("CompanyStage not found");
    } catch (error) {
      logError(error, req, "CompanyStageService-getCompanyStage");
      res.status(500).send("Error retrieving companyStage");
    }
  }

  public async createCompanyStage(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.companyStageRepository.createCompanyStage(req, data);
      res.status(201).json({ data: created, message: "CompanyStage created successfully" });
    } catch (error) {
      logError(error, req, "CompanyStageService-createCompanyStage");
      res.status(500).send("CompanyStage creation failed");
    }
  }

  public async updateCompanyStage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.companyStageRepository.updateCompanyStage(req, id, data);
      if (updated) res.json({ data: updated, message: "CompanyStage updated successfully" });
      else res.status(404).send("CompanyStage not found");
    } catch (error) {
      logError(error, req, "CompanyStageService-updateCompanyStage");
      res.status(500).send("CompanyStage update failed");
    }
  }

  public async deleteCompanyStage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.companyStageRepository.deleteCompanyStage(req, id);
      if (deleted) res.json({ data: deleted, message: "CompanyStage deleted successfully" });
      else res.status(404).send("CompanyStage not found");
    } catch (error) {
      logError(error, req, "CompanyStageService-deleteCompanyStage");
      res.status(500).send("CompanyStage deletion failed");
    }
  }
}

export default CompanyStageService;

import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import CompanyBusinessModelRepository from "../database/repositories/companyBusinessModel";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class CompanyBusinessModelService {
  private companyBusinessModelRepository: CompanyBusinessModelRepository;

  constructor() {
    this.companyBusinessModelRepository = new CompanyBusinessModelRepository();
  }

  public async getCompanyBusinessModels(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.companyBusinessModelRepository.getCompanyBusinessModels(req, pagination, dynamicQuery);
      res.json({
        message: "CompanyBusinessModels retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "CompanyBusinessModelService-getCompanyBusinessModels");
      res.status(500).send("CompanyBusinessModels retrieval failed");
    }
  }

  public async getCompanyBusinessModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.companyBusinessModelRepository.getCompanyBusinessModelById(req, id);
      if (item) res.json(item);
      else res.status(404).send("CompanyBusinessModel not found");
    } catch (error) {
      logError(error, req, "CompanyBusinessModelService-getCompanyBusinessModel");
      res.status(500).send("Error retrieving companyBusinessModel");
    }
  }

  public async createCompanyBusinessModel(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.companyBusinessModelRepository.createCompanyBusinessModel(req, data);
      res.status(201).json({ data: created, message: "CompanyBusinessModel created successfully" });
    } catch (error) {
      logError(error, req, "CompanyBusinessModelService-createCompanyBusinessModel");
      res.status(500).send("CompanyBusinessModel creation failed");
    }
  }

  public async updateCompanyBusinessModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.companyBusinessModelRepository.updateCompanyBusinessModel(req, id, data);
      if (updated) res.json({ data: updated, message: "CompanyBusinessModel updated successfully" });
      else res.status(404).send("CompanyBusinessModel not found");
    } catch (error) {
      logError(error, req, "CompanyBusinessModelService-updateCompanyBusinessModel");
      res.status(500).send("CompanyBusinessModel update failed");
    }
  }

  public async deleteCompanyBusinessModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.companyBusinessModelRepository.deleteCompanyBusinessModel(req, id);
      if (deleted) res.json({ data: deleted, message: "CompanyBusinessModel deleted successfully" });
      else res.status(404).send("CompanyBusinessModel not found");
    } catch (error) {
      logError(error, req, "CompanyBusinessModelService-deleteCompanyBusinessModel");
      res.status(500).send("CompanyBusinessModel deletion failed");
    }
  }
}

export default CompanyBusinessModelService;

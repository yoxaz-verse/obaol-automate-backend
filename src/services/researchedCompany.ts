import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import ResearchedCompanyRepository from "../database/repositories/researchedCompany";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class ResearchedCompanyService {
  private researchedCompanyRepository: ResearchedCompanyRepository;

  constructor() {
    this.researchedCompanyRepository = new ResearchedCompanyRepository();
  }

  public async getResearchedCompanys(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.researchedCompanyRepository.getResearchedCompanys(req, pagination, dynamicQuery);
      res.json({
        message: "ResearchedCompanys retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "ResearchedCompanyService-getResearchedCompanys");
      res.status(500).send("ResearchedCompanys retrieval failed");
    }
  }

  public async getResearchedCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.researchedCompanyRepository.getResearchedCompanyById(req, id);
      if (item) res.json(item);
      else res.status(404).send("ResearchedCompany not found");
    } catch (error) {
      logError(error, req, "ResearchedCompanyService-getResearchedCompany");
      res.status(500).send("Error retrieving researchedCompany");
    }
  }

  public async createResearchedCompany(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.researchedCompanyRepository.createResearchedCompany(req, data);
      res.status(201).json({ data: created, message: "ResearchedCompany created successfully" });
    } catch (error) {
      logError(error, req, "ResearchedCompanyService-createResearchedCompany");
      res.status(500).send("ResearchedCompany creation failed");
    }
  }

  public async updateResearchedCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.researchedCompanyRepository.updateResearchedCompany(req, id, data);
      if (updated) res.json({ data: updated, message: "ResearchedCompany updated successfully" });
      else res.status(404).send("ResearchedCompany not found");
    } catch (error) {
      logError(error, req, "ResearchedCompanyService-updateResearchedCompany");
      res.status(500).send("ResearchedCompany update failed");
    }
  }

  public async deleteResearchedCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.researchedCompanyRepository.deleteResearchedCompany(req, id);
      if (deleted) res.json({ data: deleted, message: "ResearchedCompany deleted successfully" });
      else res.status(404).send("ResearchedCompany not found");
    } catch (error) {
      logError(error, req, "ResearchedCompanyService-deleteResearchedCompany");
      res.status(500).send("ResearchedCompany deletion failed");
    }
  }
}

export default ResearchedCompanyService;

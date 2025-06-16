import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import CompanyTypeRepository from "../database/repositories/companyType";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class CompanyTypeService {
  private companyTypeRepository: CompanyTypeRepository;

  constructor() {
    this.companyTypeRepository = new CompanyTypeRepository();
  }

  public async getCompanyTypes(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.companyTypeRepository.getCompanyTypes(
        req,
        pagination,
        dynamicQuery
      );
      res.json({
        message: "CompanyTypes retrieved successfully",
        data: result,
      });
    } catch (error) {
      logError(error, req, "CompanyTypeService-getCompanyTypes");
      res.status(500).send("CompanyTypes retrieval failed");
    }
  }

  public async getCompanyType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.companyTypeRepository.getCompanyTypeById(req, id);
      if (item) res.json(item);
      else res.status(404).send("CompanyType not found");
    } catch (error) {
      logError(error, req, "CompanyTypeService-getCompanyType");
      res.status(500).send("Error retrieving companyType");
    }
  }

  public async createCompanyType(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.companyTypeRepository.createCompanyType(
        req,
        data
      );
      res
        .status(201)
        .json({ data: created, message: "CompanyType created successfully" });
    } catch (error) {
      logError(error, req, "CompanyTypeService-createCompanyType");
      res.status(500).send("CompanyType creation failed");
    }
  }

  public async updateCompanyType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.companyTypeRepository.updateCompanyType(
        req,
        id,
        data
      );
      if (updated)
        res.json({
          data: updated,
          message: "CompanyType updated successfully",
        });
      else res.status(404).send("CompanyType not found");
    } catch (error) {
      logError(error, req, "CompanyTypeService-updateCompanyType");
      res.status(500).send("CompanyType update failed");
    }
  }

  public async deleteCompanyType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.companyTypeRepository.deleteCompanyType(
        req,
        id
      );
      if (deleted)
        res.json({
          data: deleted,
          message: "CompanyType deleted successfully",
        });
      else res.status(404).send("CompanyType not found");
    } catch (error) {
      logError(error, req, "CompanyTypeService-deleteCompanyType");
      res.status(500).send("CompanyType deletion failed");
    }
  }
}

export default CompanyTypeService;

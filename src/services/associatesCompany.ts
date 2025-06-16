import { Request, Response } from "express";
import AssociateCompanyRepository from "../database/repositories/associateCompany";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class AssociateCompanyService {
  private associateCompanyRepository: AssociateCompanyRepository;

  constructor() {
    this.associateCompanyRepository = new AssociateCompanyRepository();
  }

  public async getAssociateCompanies(req: Request, res: Response) {
    try {
      const { page, limit, ...filters } = req.query;
      const pagination = paginationHandler(req);
      const dynamicQuery = buildDynamicQuery(filters);

      const companies =
        await this.associateCompanyRepository.getAssociateCompanies(
          req,
          pagination,
          dynamicQuery
        );
      res.json({
        data: companies,
        message: "Associate Companies retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "AssociateCompanyService-getAssociateCompanies");
      res.status(500).send("Associate Companies retrieval failed");
    }
  }

  public async getAssociateCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const company =
        await this.associateCompanyRepository.getAssociateCompanyById(req, id);
      res.json(company);
    } catch (error) {
      logError(error, req, "AssociateCompanyService-getAssociateCompany");
      res.status(404).send("Associate Company not found");
    }
  }

  public async createAssociateCompany(req: Request, res: Response) {
    try {
      let companyData = req.body;

      // Sanitize optional ObjectId fields
      if (companyData.pincodeEntry === "") companyData.pincodeEntry = undefined;
      if (companyData.division === "") companyData.division = undefined;

      const newCompany =
        await this.associateCompanyRepository.createAssociateCompany(
          req,
          companyData
        );

      res.status(201).json({
        data: newCompany,
        message: "Associate Company created successfully",
      });
    } catch (error) {
      logError(error, req, "AssociateCompanyService-createAssociateCompany");
      res.status(500).send("Associate Company creation failed");
    }
  }

  public async updateAssociateCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyData = req.body;
      const updatedCompany =
        await this.associateCompanyRepository.updateAssociateCompany(
          req,
          id,
          companyData
        );
      res.json({
        data: updatedCompany,
        message: "Associate Company updated successfully",
      });
    } catch (error) {
      logError(error, req, "AssociateCompanyService-updateAssociateCompany");
      res.status(500).send("Associate Company update failed");
    }
  }

  public async deleteAssociateCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log("id");
      console.log(id);

      const deletedCompany =
        await this.associateCompanyRepository.deleteAssociateCompany(req, id);
      res.json({
        data: deletedCompany,
        message: "Associate Company deleted successfully",
      });
    } catch (error) {
      logError(error, req, "AssociateCompanyService-deleteAssociateCompany");
      res.status(500).send("Associate Company deletion failed");
    }
  }
}

export default AssociateCompanyService;

import { Request, Response } from "express";
import ServiceCompanyRepository from "../database/repositories/serviceCompany";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ServiceCompanyService {
  private serviceCompanyRepository: ServiceCompanyRepository;

  constructor() {
    this.serviceCompanyRepository = new ServiceCompanyRepository();
  }

  public async getServiceCompanies(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const serviceCompanies =
        await this.serviceCompanyRepository.getServiceCompanies(
          req,
          pagination,
          search
        );
      res.sendArrayFormatted(
        serviceCompanies,
        "ServiceCompanies retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-getServiceCompanies");
      res.sendError(error, "ServiceCompanies retrieval failed");
    }
  }

  public async getServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const serviceCompany =
        await this.serviceCompanyRepository.getServiceCompanyById(req, id);
      res.sendFormatted(
        serviceCompany,
        "ServiceCompany retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-getServiceCompany");
      res.sendError(error, "ServiceCompany retrieval failed");
    }
  }

  public async createServiceCompany(req: Request, res: Response) {
    try {
      const serviceCompanyData = req.body;
      const newServiceCompany =
        await this.serviceCompanyRepository.createServiceCompany(
          req,
          serviceCompanyData
        );
      res.sendFormatted(
        newServiceCompany,
        "ServiceCompany created successfully",
        201
      );
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-createServiceCompany");
      res.sendError(error, "ServiceCompany creation failed");
    }
  }

  public async updateServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const serviceCompanyData = req.body;
      const updatedServiceCompany =
        await this.serviceCompanyRepository.updateServiceCompany(
          req,
          id,
          serviceCompanyData
        );
      res.sendFormatted(
        updatedServiceCompany,
        "ServiceCompany updated successfully"
      );
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-updateServiceCompany");
      res.sendError(error, "ServiceCompany update failed");
    }
  }

  public async deleteServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedServiceCompany =
        await this.serviceCompanyRepository.deleteServiceCompany(req, id);
      res.sendFormatted(
        deletedServiceCompany,
        "ServiceCompany deleted successfully"
      );
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-deleteServiceCompany");
      res.sendError(error, "ServiceCompany deletion failed");
    }
  }
}

export default ServiceCompanyService;

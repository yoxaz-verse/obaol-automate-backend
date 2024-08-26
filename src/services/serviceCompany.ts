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
      const serviceCompanies = await this.serviceCompanyRepository.getServiceCompanies(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(serviceCompanies, "Service Companies retrieved successfully");
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-getServiceCompanies");
      res.sendError(error, "Service Companies retrieval failed");
    }
  }

  public async getServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const serviceCompany = await this.serviceCompanyRepository.getServiceCompanyById(req, id);
      res.sendFormatted(serviceCompany, "Service Company retrieved successfully");
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-getServiceCompany");
      res.sendError(error, "Service Company retrieval failed");
    }
  }

  public async createServiceCompany(req: Request, res: Response) {
    try {
      const serviceCompanyData = req.body;
      const newServiceCompany = await this.serviceCompanyRepository.createServiceCompany(req, serviceCompanyData);
      res.sendFormatted(newServiceCompany, "Service Company created successfully", 201);
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-createServiceCompany");
      res.sendError(error, "Service Company creation failed");
    }
  }

  public async updateServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const serviceCompanyData = req.body;
      const updatedServiceCompany = await this.serviceCompanyRepository.updateServiceCompany(
        req,
        id,
        serviceCompanyData
      );
      res.sendFormatted(updatedServiceCompany, "Service Company updated successfully");
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-updateServiceCompany");
      res.sendError(error, "Service Company update failed");
    }
  }

  public async deleteServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedServiceCompany = await this.serviceCompanyRepository.deleteServiceCompany(req, id);
      res.sendFormatted(deletedServiceCompany, "Service Company deleted successfully");
    } catch (error) {
      await logError(error, req, "ServiceCompanyService-deleteServiceCompany");
      res.sendError(error, "Service Company deletion failed");
    }
  }
}

export default ServiceCompanyService;

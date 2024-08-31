import { Request } from "express";
import { ServiceCompanyModel } from "../models/serviceCompany";
import {
  IServiceCompany,
  ICreateServiceCompany,
  IUpdateServiceCompany,
} from "../../interfaces/serviceCompany";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ServiceCompanyRepository {
  public async getServiceCompanies(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IServiceCompany[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const serviceCompanies = await ServiceCompanyModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ServiceCompanyModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: serviceCompanies,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(
        error,
        req,
        "ServiceCompanyRepository-getServiceCompanies"
      );
      throw error;
    }
  }

  public async getServiceCompanyById(
    req: Request,
    id: string
  ): Promise<IServiceCompany> {
    try {
      const serviceCompany = await ServiceCompanyModel.findById(id).lean();
      if (!serviceCompany || serviceCompany.isDeleted) {
        throw new Error("ServiceCompany not found");
      }
      return serviceCompany;
    } catch (error) {
      await logError(
        error,
        req,
        "ServiceCompanyRepository-getServiceCompanyById"
      );
      throw error;
    }
  }

  public async createServiceCompany(
    req: Request,
    serviceCompanyData: ICreateServiceCompany
  ): Promise<IServiceCompany> {
    try {
      const newServiceCompany = await ServiceCompanyModel.create(
        serviceCompanyData
      );
      return newServiceCompany.toObject();
    } catch (error) {
      await logError(
        error,
        req,
        "ServiceCompanyRepository-createServiceCompany"
      );
      throw error;
    }
  }

  public async updateServiceCompany(
    req: Request,
    id: string,
    serviceCompanyData: Partial<IUpdateServiceCompany>
  ): Promise<IServiceCompany> {
    try {
      const updatedServiceCompany = await ServiceCompanyModel.findByIdAndUpdate(
        id,
        serviceCompanyData,
        {
          new: true,
        }
      );
      if (!updatedServiceCompany || updatedServiceCompany.isDeleted) {
        throw new Error("Failed to update service company");
      }
      return updatedServiceCompany.toObject();
    } catch (error) {
      await logError(
        error,
        req,
        "ServiceCompanyRepository-updateServiceCompany"
      );
      throw error;
    }
  }

  public async deleteServiceCompany(
    req: Request,
    id: string
  ): Promise<IServiceCompany> {
    try {
      const deletedServiceCompany = await ServiceCompanyModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      );
      if (!deletedServiceCompany) {
        throw new Error("Failed to delete service company");
      }
      return deletedServiceCompany.toObject();
    } catch (error) {
      await logError(
        error,
        req,
        "ServiceCompanyRepository-deleteServiceCompany"
      );
      throw error;
    }
  }
}

export default ServiceCompanyRepository;

import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { CompanyTypeModel } from "../../database/models/companyType";

class CompanyTypeRepository {
  public async getCompanyTypes(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await CompanyTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await CompanyTypeModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "CompanyTypeRepository-getCompanyTypes");
      throw error;
    }
  }

  public async getCompanyTypeById(req: Request, id: string) {
    try {
      const doc = await CompanyTypeModel.findById(id);
      if (!doc) throw new Error("CompanyType not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "CompanyTypeRepository-getCompanyTypeById");
      throw error;
    }
  }

  public async createCompanyType(req: Request, data: any) {
    try {
      const created = await CompanyTypeModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "CompanyTypeRepository-createCompanyType");
      throw error;
    }
  }

  public async updateCompanyType(req: Request, id: string, data: any) {
    try {
      const updated = await CompanyTypeModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update companyType");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "CompanyTypeRepository-updateCompanyType");
      throw error;
    }
  }

  public async deleteCompanyType(req: Request, id: string) {
    try {
      const deleted = await CompanyTypeModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete companyType");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "CompanyTypeRepository-deleteCompanyType");
      throw error;
    }
  }
}

export default CompanyTypeRepository;

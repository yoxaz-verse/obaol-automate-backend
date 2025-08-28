import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { CompanyBusinessModelModel } from "../../database/models/companyBusinessModel";

class CompanyBusinessModelRepository {
  public async getCompanyBusinessModels(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await CompanyBusinessModelModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await CompanyBusinessModelModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "CompanyBusinessModelRepository-getCompanyBusinessModels");
      throw error;
    }
  }

  public async getCompanyBusinessModelById(req: Request, id: string) {
    try {
      const doc = await CompanyBusinessModelModel.findById(id);
      if (!doc) throw new Error("CompanyBusinessModel not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "CompanyBusinessModelRepository-getCompanyBusinessModelById");
      throw error;
    }
  }

  public async createCompanyBusinessModel(req: Request, data: any) {
    try {
      const created = await CompanyBusinessModelModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "CompanyBusinessModelRepository-createCompanyBusinessModel");
      throw error;
    }
  }

  public async updateCompanyBusinessModel(req: Request, id: string, data: any) {
    try {
      const updated = await CompanyBusinessModelModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update companyBusinessModel");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "CompanyBusinessModelRepository-updateCompanyBusinessModel");
      throw error;
    }
  }

  public async deleteCompanyBusinessModel(req: Request, id: string) {
    try {
      const deleted = await CompanyBusinessModelModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete companyBusinessModel");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "CompanyBusinessModelRepository-deleteCompanyBusinessModel");
      throw error;
    }
  }
}

export default CompanyBusinessModelRepository;

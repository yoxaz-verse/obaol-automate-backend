import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { CompanyStageModel } from "../../database/models/companyStage";

class CompanyStageRepository {
  public async getCompanyStages(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await CompanyStageModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await CompanyStageModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "CompanyStageRepository-getCompanyStages");
      throw error;
    }
  }

  public async getCompanyStageById(req: Request, id: string) {
    try {
      const doc = await CompanyStageModel.findById(id);
      if (!doc) throw new Error("CompanyStage not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "CompanyStageRepository-getCompanyStageById");
      throw error;
    }
  }

  public async createCompanyStage(req: Request, data: any) {
    try {
      const created = await CompanyStageModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "CompanyStageRepository-createCompanyStage");
      throw error;
    }
  }

  public async updateCompanyStage(req: Request, id: string, data: any) {
    try {
      const updated = await CompanyStageModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update companyStage");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "CompanyStageRepository-updateCompanyStage");
      throw error;
    }
  }

  public async deleteCompanyStage(req: Request, id: string) {
    try {
      const deleted = await CompanyStageModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete companyStage");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "CompanyStageRepository-deleteCompanyStage");
      throw error;
    }
  }
}

export default CompanyStageRepository;

import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { ResearchedCompanyModel } from "../../database/models/researchedCompany";

class ResearchedCompanyRepository {
  public async getResearchedCompanys(
    req: Request,
    pagination: IPagination,
    query: any
  ) {
    try {
      const docs = await ResearchedCompanyModel.find(query)
        .populate(
          "state division companyType district companyStage product certification companyBusinessModel companyIntent pincodeEntry"
        )
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await ResearchedCompanyModel.countDocuments(query);
      return {
        data: docs.map((d) => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(
        error,
        req,
        "ResearchedCompanyRepository-getResearchedCompanies"
      );
      throw error;
    }
  }

  public async getResearchedCompanyById(req: Request, id: string) {
    try {
      const doc = await ResearchedCompanyModel.findById(id);
      if (!doc) throw new Error("ResearchedCompany not found");
      return doc.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "ResearchedCompanyRepository-getResearchedCompanyById"
      );
      throw error;
    }
  }

  public async createResearchedCompany(req: Request, data: any) {
    try {
      const created = await ResearchedCompanyModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "ResearchedCompanyRepository-createResearchedCompany"
      );
      throw error;
    }
  }

  public async updateResearchedCompany(req: Request, id: string, data: any) {
    try {
      const updated = await ResearchedCompanyModel.findByIdAndUpdate(id, data, {
        new: true,
      });
      if (!updated) throw new Error("Failed to update researchedCompany");
      return updated.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "ResearchedCompanyRepository-updateResearchedCompany"
      );
      throw error;
    }
  }

  public async deleteResearchedCompany(req: Request, id: string) {
    try {
      const deleted = await ResearchedCompanyModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete researchedCompany");
      return deleted.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "ResearchedCompanyRepository-deleteResearchedCompany"
      );
      throw error;
    }
  }
}

export default ResearchedCompanyRepository;

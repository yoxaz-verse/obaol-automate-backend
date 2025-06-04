import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { AbbreviationModel } from "../../database/models/abbreviation";

class AbbreviationRepository {
  public async getAbbreviations(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await AbbreviationModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await AbbreviationModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "AbbreviationRepository-getAbbreviations");
      throw error;
    }
  }

  public async getAbbreviationById(req: Request, id: string) {
    try {
      const doc = await AbbreviationModel.findById(id);
      if (!doc) throw new Error("Abbreviation not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "AbbreviationRepository-getAbbreviationById");
      throw error;
    }
  }

  public async createAbbreviation(req: Request, data: any) {
    try {
      const created = await AbbreviationModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "AbbreviationRepository-createAbbreviation");
      throw error;
    }
  }

  public async updateAbbreviation(req: Request, id: string, data: any) {
    try {
      const updated = await AbbreviationModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update abbreviation");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "AbbreviationRepository-updateAbbreviation");
      throw error;
    }
  }

  public async deleteAbbreviation(req: Request, id: string) {
    try {
      const deleted = await AbbreviationModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete abbreviation");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "AbbreviationRepository-deleteAbbreviation");
      throw error;
    }
  }
}

export default AbbreviationRepository;

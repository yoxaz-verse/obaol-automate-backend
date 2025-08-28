import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { LanguageModel } from "../../database/models/language";

class LanguageRepository {
  public async getLanguages(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await LanguageModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await LanguageModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "LanguageRepository-getLanguages");
      throw error;
    }
  }

  public async getLanguageById(req: Request, id: string) {
    try {
      const doc = await LanguageModel.findById(id);
      if (!doc) throw new Error("Language not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "LanguageRepository-getLanguageById");
      throw error;
    }
  }

  public async createLanguage(req: Request, data: any) {
    try {
      const created = await LanguageModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "LanguageRepository-createLanguage");
      throw error;
    }
  }

  public async updateLanguage(req: Request, id: string, data: any) {
    try {
      const updated = await LanguageModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update language");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "LanguageRepository-updateLanguage");
      throw error;
    }
  }

  public async deleteLanguage(req: Request, id: string) {
    try {
      const deleted = await LanguageModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete language");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "LanguageRepository-deleteLanguage");
      throw error;
    }
  }
}

export default LanguageRepository;

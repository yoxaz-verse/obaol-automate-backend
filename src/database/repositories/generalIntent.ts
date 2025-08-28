import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { GeneralIntentModel } from "../../database/models/generalIntent";

class GeneralIntentRepository {
  public async getGeneralIntents(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await GeneralIntentModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await GeneralIntentModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "GeneralIntentRepository-getGeneralIntents");
      throw error;
    }
  }

  public async getGeneralIntentById(req: Request, id: string) {
    try {
      const doc = await GeneralIntentModel.findById(id);
      if (!doc) throw new Error("GeneralIntent not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "GeneralIntentRepository-getGeneralIntentById");
      throw error;
    }
  }

  public async createGeneralIntent(req: Request, data: any) {
    try {
      const created = await GeneralIntentModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "GeneralIntentRepository-createGeneralIntent");
      throw error;
    }
  }

  public async updateGeneralIntent(req: Request, id: string, data: any) {
    try {
      const updated = await GeneralIntentModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update generalIntent");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "GeneralIntentRepository-updateGeneralIntent");
      throw error;
    }
  }

  public async deleteGeneralIntent(req: Request, id: string) {
    try {
      const deleted = await GeneralIntentModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete generalIntent");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "GeneralIntentRepository-deleteGeneralIntent");
      throw error;
    }
  }
}

export default GeneralIntentRepository;

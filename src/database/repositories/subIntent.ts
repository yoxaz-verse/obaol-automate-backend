import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { SubIntentModel } from "../../database/models/subIntent";

class SubIntentRepository {
  public async getSubIntents(
    req: Request,
    pagination: IPagination,
    query: any
  ) {
    try {
      const docs = await SubIntentModel.find(query)
        .populate("generalIntent")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await SubIntentModel.countDocuments(query);
      return {
        data: docs.map((d) => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "SubIntentRepository-getSubIntents");
      throw error;
    }
  }

  public async getSubIntentById(req: Request, id: string) {
    try {
      const doc = await SubIntentModel.findById(id);
      if (!doc) throw new Error("SubIntent not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "SubIntentRepository-getSubIntentById");
      throw error;
    }
  }

  public async createSubIntent(req: Request, data: any) {
    try {
      const created = await SubIntentModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "SubIntentRepository-createSubIntent");
      throw error;
    }
  }

  public async updateSubIntent(req: Request, id: string, data: any) {
    try {
      const updated = await SubIntentModel.findByIdAndUpdate(id, data, {
        new: true,
      });
      if (!updated) throw new Error("Failed to update subIntent");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "SubIntentRepository-updateSubIntent");
      throw error;
    }
  }

  public async deleteSubIntent(req: Request, id: string) {
    try {
      const deleted = await SubIntentModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete subIntent");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "SubIntentRepository-deleteSubIntent");
      throw error;
    }
  }
}

export default SubIntentRepository;

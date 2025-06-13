import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { DivisionModel } from "../../database/models/division";

class DivisionRepository {
  public async getDivisions(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await DivisionModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await DivisionModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "DivisionRepository-getDivisions");
      throw error;
    }
  }

  public async getDivisionById(req: Request, id: string) {
    try {
      const doc = await DivisionModel.findById(id);
      if (!doc) throw new Error("Division not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "DivisionRepository-getDivisionById");
      throw error;
    }
  }

  public async createDivision(req: Request, data: any) {
    try {
      const created = await DivisionModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "DivisionRepository-createDivision");
      throw error;
    }
  }

  public async updateDivision(req: Request, id: string, data: any) {
    try {
      const updated = await DivisionModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update division");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "DivisionRepository-updateDivision");
      throw error;
    }
  }

  public async deleteDivision(req: Request, id: string) {
    try {
      const deleted = await DivisionModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete division");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "DivisionRepository-deleteDivision");
      throw error;
    }
  }
}

export default DivisionRepository;

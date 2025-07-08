import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { UnLoCodeStatusModel } from "../../database/models/unLoCodeStatus";

class UnLoCodeStatusRepository {
  public async getUnLoCodeStatuss(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await UnLoCodeStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await UnLoCodeStatusModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "UnLoCodeStatusRepository-getUnLoCodeStatuss");
      throw error;
    }
  }

  public async getUnLoCodeStatusById(req: Request, id: string) {
    try {
      const doc = await UnLoCodeStatusModel.findById(id);
      if (!doc) throw new Error("UnLoCodeStatus not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeStatusRepository-getUnLoCodeStatusById");
      throw error;
    }
  }

  public async createUnLoCodeStatus(req: Request, data: any) {
    try {
      const created = await UnLoCodeStatusModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeStatusRepository-createUnLoCodeStatus");
      throw error;
    }
  }

  public async updateUnLoCodeStatus(req: Request, id: string, data: any) {
    try {
      const updated = await UnLoCodeStatusModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update unLoCodeStatus");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeStatusRepository-updateUnLoCodeStatus");
      throw error;
    }
  }

  public async deleteUnLoCodeStatus(req: Request, id: string) {
    try {
      const deleted = await UnLoCodeStatusModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete unLoCodeStatus");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeStatusRepository-deleteUnLoCodeStatus");
      throw error;
    }
  }
}

export default UnLoCodeStatusRepository;

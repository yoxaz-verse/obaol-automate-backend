import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { UnLoCodeAdminAreaModel } from "../../database/models/unLoCodeAdminArea";

class UnLoCodeAdminAreaRepository {
  public async getUnLoCodeAdminAreas(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await UnLoCodeAdminAreaModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await UnLoCodeAdminAreaModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaRepository-getUnLoCodeAdminAreas");
      throw error;
    }
  }

  public async getUnLoCodeAdminAreaById(req: Request, id: string) {
    try {
      const doc = await UnLoCodeAdminAreaModel.findById(id);
      if (!doc) throw new Error("UnLoCodeAdminArea not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaRepository-getUnLoCodeAdminAreaById");
      throw error;
    }
  }

  public async createUnLoCodeAdminArea(req: Request, data: any) {
    try {
      const created = await UnLoCodeAdminAreaModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaRepository-createUnLoCodeAdminArea");
      throw error;
    }
  }

  public async updateUnLoCodeAdminArea(req: Request, id: string, data: any) {
    try {
      const updated = await UnLoCodeAdminAreaModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update unLoCodeAdminArea");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaRepository-updateUnLoCodeAdminArea");
      throw error;
    }
  }

  public async deleteUnLoCodeAdminArea(req: Request, id: string) {
    try {
      const deleted = await UnLoCodeAdminAreaModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete unLoCodeAdminArea");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaRepository-deleteUnLoCodeAdminArea");
      throw error;
    }
  }
}

export default UnLoCodeAdminAreaRepository;

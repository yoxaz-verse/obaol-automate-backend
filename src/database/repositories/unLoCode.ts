import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { UnLoCodeModel } from "../../database/models/unLoCode";

class UnLoCodeRepository {
  public async getUnLoCodes(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await UnLoCodeModel.find(query)
        .populate("country")
        .populate("functions")
        .populate("status")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const totalCount = await UnLoCodeModel.countDocuments(query);

      return {
        data: docs.map((d) => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "UnLoCodeRepository-getUnLoCodes");
      throw error;
    }
  }

  public async getUnLoCodeById(req: Request, id: string) {
    try {
      const doc = await UnLoCodeModel.findById(id)
        .populate("country")
        .populate("functions")
        .populate("status");

      if (!doc) throw new Error("UnLoCode not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeRepository-getUnLoCodeById");
      throw error;
    }
  }

  public async createUnLoCode(req: Request, data: any) {
    try {
      const created = await UnLoCodeModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeRepository-createUnLoCode");
      throw error;
    }
  }

  public async updateUnLoCode(req: Request, id: string, data: any) {
    try {
      const updated = await UnLoCodeModel.findByIdAndUpdate(id, data, {
        new: true,
      });
      if (!updated) throw new Error("Failed to update unLoCode");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeRepository-updateUnLoCode");
      throw error;
    }
  }

  public async deleteUnLoCode(req: Request, id: string) {
    try {
      const deleted = await UnLoCodeModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete unLoCode");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeRepository-deleteUnLoCode");
      throw error;
    }
  }
}

export default UnLoCodeRepository;

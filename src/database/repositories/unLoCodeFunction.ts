import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { UnLoCodeFunctionsModel } from "../../database/models/unLoCodeFunction";

class UnLoCodeFunctionRepository {
  public async getUnLoCodeFunctions(
    req: Request,
    pagination: IPagination,
    query: any
  ) {
    try {
      const docs = await UnLoCodeFunctionsModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await UnLoCodeFunctionsModel.countDocuments(query);
      return {
        data: docs.map((d) => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionRepository-getUnLoCodeFunctions");
      throw error;
    }
  }

  public async getUnLoCodeFunctionById(req: Request, id: string) {
    try {
      const doc = await UnLoCodeFunctionsModel.findById(id);
      if (!doc) throw new Error("UnLoCodeFunction not found");
      return doc.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "UnLoCodeFunctionRepository-getUnLoCodeFunctionById"
      );
      throw error;
    }
  }

  public async createUnLoCodeFunction(req: Request, data: any) {
    try {
      const created = await UnLoCodeFunctionsModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionRepository-createUnLoCodeFunction");
      throw error;
    }
  }

  public async updateUnLoCodeFunction(req: Request, id: string, data: any) {
    try {
      const updated = await UnLoCodeFunctionsModel.findByIdAndUpdate(id, data, {
        new: true,
      });
      if (!updated) throw new Error("Failed to update unLoCodeFunction");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionRepository-updateUnLoCodeFunction");
      throw error;
    }
  }

  public async deleteUnLoCodeFunction(req: Request, id: string) {
    try {
      const deleted = await UnLoCodeFunctionsModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete unLoCodeFunction");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionRepository-deleteUnLoCodeFunction");
      throw error;
    }
  }
}

export default UnLoCodeFunctionRepository;

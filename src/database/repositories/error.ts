import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IError } from "../../interfaces/error";
import { ErrorModel } from "../models/error";
import { IPagination } from "../../interfaces/pagination";

class ErrorRepository {
  public async getErrors(
    req: Request,
    pagination: IPagination
  ): Promise<{
    errors: IError[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const errors = await ErrorModel.find()
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await ErrorModel.countDocuments();
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        errors,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ErrorService-getErrors");
      throw new Error("Error retrieval failed");
    }
  }

  public async resolveError(req: Request, id: string): Promise<IError | null> {
    try {
      return await ErrorModel.findByIdAndUpdate(
        id,
        { $set: { resolved: true } },
        { new: true }
      );
    } catch (error) {
      await logError(error, req, "ErrorService-resolveError");
      throw new Error("Error resolution failed");
    }
  }

  public async deleteError(req: Request, id: string): Promise<IError | null> {
    try {
      return await ErrorModel.findByIdAndDelete(id);
    } catch (error) {
      await logError(error, req, "ErrorService-deleteError");
      throw new Error("Error deletion failed");
    }
  }

  public async batchDeleteErrors(
    req: Request,
    ids: string[]
  ): Promise<IError[]> {
    try {
      const result = await ErrorModel.deleteMany({ _id: { $in: ids } });
      return result.deletedCount > 0
        ? ids.map((id) => ({ _id: id } as unknown as IError))
        : [];
    } catch (error) {
      await logError(error, req, "ErrorService-batchDeleteErrors");
      throw new Error("Batch error deletion failed");
    }
  }
}

export default ErrorRepository;

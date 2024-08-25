import { Request, Response } from "express";
import ErrorRepository from "../database/repositories/error";
import { IError } from "../interfaces/error";
import { logError } from "../utils/errorLogger";
import { IPagination } from "../interfaces/pagination";
import { paginationHandler } from "../utils/paginationHandler";

class ErrorService {
  private errorRepository: ErrorRepository;

  constructor() {
    this.errorRepository = new ErrorRepository();
  }

  public async getErrors(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const errors = await this.errorRepository.getErrors(req, pagination);
      res.sendFormatted(errors, "Errors retrieved successfully");
    } catch (error) {
      await logError(error, req, "Service-getErrors");
      res.sendError(error, "Error retrieval failed");
    }
  }

  public async resolveError(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const resolvedError = await this.errorRepository.resolveError(req, id);
      if (!resolvedError) {
        res.sendError(null, "Error not found", 404);
        return;
      }
      res.sendFormatted(resolvedError, "Error resolved successfully");
    } catch (error) {
      await logError(error, req, "Service-resolveError");
      res.sendError(error, "Error resolution failed");
    }
  }

  public async deleteError(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedError = await this.errorRepository.deleteError(req, id);
      if (!deletedError) {
        res.sendError(null, "Error not found", 404);
        return;
      }
      res.sendFormatted(deletedError, "Error deleted successfully");
    } catch (error) {
      await logError(error, req, "Service-deleteError");
      res.sendError(error, "Error deletion failed");
    }
  }

  public async batchDeleteErrors(req: Request, res: Response) {
    try {
      const ids = req.body;
      const deletedErrors = await this.errorRepository.batchDeleteErrors(
        req,
        ids
      );
      res.sendFormatted(deletedErrors, "Errors deleted successfully");
    } catch (error) {
      await logError(error, req, "Service-batchDeleteErrors");
      res.sendError(error, "Error deletion failed");
    }
  }
}

export default ErrorService;


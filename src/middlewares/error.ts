import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ErrorMiddleware {
  constructor() {}

  public async resolveError(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided", // Technical error details
          "ID must be provided", // User-friendly message
          400
        );
        return;
      }
      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ErrorResolve");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }

  public async deleteError(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided", // Technical error details
          "ID must be provided", // User-friendly message
          400
        );
        return;
      }
      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ErrorDelete");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }

  public async batchDeleteErrors(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ids = req.body;
      if (!ids) {
        res.sendError(
          "ValidationError: IDs must be provided", // Technical error details
          "IDs must be provided", // User-friendly message
          400
        );
        return;
      }
      // Check if ids is an array
      if (!Array.isArray(ids)) {
        res.sendError(
          "ValidationError: IDs must be an array", // Technical error details
          "IDs must be an array", // User-friendly message
          400
        );
        return;
      }

      // Check if ids is not empty
      if (ids.length === 0) {
        res.sendError(
          "ValidationError: IDs must not be empty", // Technical error details
          "IDs must not be empty", // User-friendly message
          400
        );
        return;
      }

      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ErrorBatchDelete");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }
}

export default ErrorMiddleware;


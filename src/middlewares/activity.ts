import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, budget, project, workers, updatedBy, updatedByModel, status, customer } = req.body;
      if (!title || !description || !budget || !project || !updatedBy || !updatedByModel || !status || !customer) {
        res.sendError(
          "ValidationError: Title, Description, Budget, Project, UpdatedBy, UpdatedByModel, Status, and Customer are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      // Add more validation as needed (e.g., check data types, references existence)
      next();
    } catch (error) {
      await logError(error, req, "ActivityMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, budget, project, workers, updatedBy, updatedByModel, status, customer, isActive, isDeleted } = req.body;
      if (!title && !description && !budget && !project && !workers && !updatedBy && !updatedByModel && !status && !customer && isActive === undefined && isDeleted === undefined) {
        res.sendError(
          "ValidationError: At least one field must be provided for update",
          "At least one field must be provided for update",
          400
        );
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "ActivityMiddleware-validateUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "ActivityMiddleware-validateDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "ActivityMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityMiddleware;

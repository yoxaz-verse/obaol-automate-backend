import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, budget, customer, admin, manager, status } = req.body;
      if (!title || !description || !budget || !customer || !admin || !manager || !status) {
        res.sendError(
          "ValidationError: Title, Description, Budget, Customer, Admin, Manager, and Status are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "ProjectMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, budget, customer, admin, manager, status, isActive, isDeleted } = req.body;
      if (!title && !description && !budget && !customer && !admin && !manager && !status && isActive === undefined && isDeleted === undefined) {
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
      await logError(error, req, "ProjectMiddleware-validateUpdate");
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
      await logError(error, req, "ProjectMiddleware-validateDelete");
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
      await logError(error, req, "ProjectMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectMiddleware;

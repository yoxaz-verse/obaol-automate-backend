import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityTypeMiddleware {
  public async createActivityType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityTypeCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateActivityType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided for update",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityTypeUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteActivityType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityTypeDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getActivityType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityTypeGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityTypeMiddleware;

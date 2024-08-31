import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityStatusMiddleware {
  public async createActivityStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityStatusCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateActivityStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityStatusUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteActivityStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityStatusDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getActivityStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityStatusGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityStatusMiddleware;

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationTypeMiddleware {
  public async createLocationType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationTypeCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateLocationType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationTypeUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteLocationType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationTypeDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getLocationType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationTypeGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationTypeMiddleware;

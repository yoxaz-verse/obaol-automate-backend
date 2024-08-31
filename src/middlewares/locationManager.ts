import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationManagerMiddleware {
  public async createLocationManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name, manager, managingLocations } = req.body;
      if (!code || !name || !manager) {
        res.sendError(
          "ValidationError: Code, Name, and Manager must be provided",
          "Code, Name, and Manager must be provided",
          400
        );
        return;
      }
      if (!Array.isArray(managingLocations)) {
        res.sendError(
          "ValidationError: Managing Locations must be an array",
          "Managing Locations must be an array",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationManagerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateLocationManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name, manager, managingLocations } = req.body;
      if (!code && !name && !manager && !managingLocations) {
        res.sendError(
          "ValidationError: At least one field must be provided",
          "At least one field must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationManagerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteLocationManager(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationManagerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getLocationManager(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationManagerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationManagerMiddleware;

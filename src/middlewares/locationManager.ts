import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationManagerMiddleware {
  public async createLocationManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Code and Name must be provided",
          "Code and Name must be provided",
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

  public async updateLocationManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { code, name } = req.body;
      if (!code && !name && !req.body.managingLocations) {
        res.sendError(
          "ValidationError: At least one field (Code, Name, or ManagingLocations) must be provided",
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

  public async deleteLocationManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
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

  public async getLocationManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
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

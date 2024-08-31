import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationMiddleware {
  public async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address, city, latitude, longitude, nation, owner, province, region, locationType, locationManagers } = req.body;
      if (!name || !address || !city || !latitude || !longitude || !nation || !owner || !province || !region || !locationType || !locationManagers) {
        res.sendError(
          "ValidationError: All fields must be provided",
          "All fields must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address, city, latitude, longitude, nation, owner, province, region, locationType, locationManagers } = req.body;
      if (!name && !address && !city && !latitude && !longitude && !nation && !owner && !province && !region && !locationType && !locationManagers) {
        res.sendError(
          "ValidationError: At least one field must be provided",
          "At least one field must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteLocation(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getLocation(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationMiddleware;

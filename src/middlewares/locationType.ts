import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationTypeMiddleware {
  public async validateLocationTypeData(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError("Name must be provided", "Validation Error", 400);
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "LocationTypeMiddleware-validateLocationTypeData");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationTypeMiddleware;


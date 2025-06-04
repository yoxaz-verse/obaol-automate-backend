import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class DistrictMiddleware {
  public async createDistrict(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Missing required fields: name is required." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-DistrictCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateDistrict(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "At least one field (name) must be provided for update." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-DistrictUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteDistrict(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-DistrictDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default DistrictMiddleware;

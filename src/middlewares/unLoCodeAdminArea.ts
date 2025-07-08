import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class UnLoCodeAdminAreaMiddleware {
  public async createUnLoCodeAdminArea(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Missing required fields: name is required." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-UnLoCodeAdminAreaCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateUnLoCodeAdminArea(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "At least one field (name) must be provided for update." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-UnLoCodeAdminAreaUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteUnLoCodeAdminArea(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-UnLoCodeAdminAreaDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default UnLoCodeAdminAreaMiddleware;

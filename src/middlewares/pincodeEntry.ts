import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class PincodeEntryMiddleware {
  public async createPincodeEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Missing required fields: name is required." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-PincodeEntryCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updatePincodeEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "At least one field (name) must be provided for update." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-PincodeEntryUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deletePincodeEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-PincodeEntryDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default PincodeEntryMiddleware;

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class CertificationMiddleware {
  public async createCertification(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Missing required fields: name is required." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CertificationCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateCertification(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "At least one field (name) must be provided for update." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CertificationUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteCertification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CertificationDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default CertificationMiddleware;

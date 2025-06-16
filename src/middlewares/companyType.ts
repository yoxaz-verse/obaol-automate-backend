import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class CompanyTypeMiddleware {
  public async createCompanyType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Missing required fields: name is required." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CompanyTypeCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateCompanyType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "At least one field (name) must be provided for update." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CompanyTypeUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteCompanyType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CompanyTypeDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default CompanyTypeMiddleware;

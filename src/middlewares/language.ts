import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LanguageMiddleware {
  public async createLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Missing required fields: name is required." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LanguageCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "At least one field (name) must be provided for update." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LanguageUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LanguageDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default LanguageMiddleware;

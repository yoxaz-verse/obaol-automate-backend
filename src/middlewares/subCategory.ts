import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class SubCategoryMiddleware {
  public async createSubCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name, category  } = req.body;
      if (!name || !category ) {
        res.status(400).json({
          error:
            "Missing required fields: Name, Category, and  are required.",
        });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-SubCategoryCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateSubCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name, category  } = req.body;
      if (!name && !category ) {
        res.status(400).json({
          error:
            "At least one field (Name, Category, or ) must be provided for update.",
        });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-SubCategoryUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteSubCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-SubCategoryDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default SubCategoryMiddleware;
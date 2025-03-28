import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class CategoryMiddleware {
  public async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, inventoryManager } = req.body;
      console.log(req.body);

      if (!name || !inventoryManager) {
        res.status(400).json({
          error:
            "Missing required fields: Name, Inventory Manager, and Locations are required.",
        });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CategoryCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, inventoryManager } = req.body;
      if (!name && !inventoryManager) {
        res.status(400).json({
          error:
            "At least one field (Name, Inventory Manager, or ) must be provided for update.",
        });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CategoryUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CategoryDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default CategoryMiddleware;

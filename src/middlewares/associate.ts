import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class AssociateMiddleware {
  public async createAssociate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name, email, phone, associateCompany, password } = req.body;
      if (!email || !name || !phone || !associateCompany || !password) {
        res.status(400).json({
          error:
            "Missing required fields: Email, Name, Phone, Associate Company, and Password are required.",
        });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-AssociateCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateAssociate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email, name, phone, password, designation } = req.body; // Assuming these are the fields that can be updated
      if (!email && !name && !phone && !password && !designation) {
        res.status(400).json({
          error:
            "At least one field (Email, Name, Phone, or Password) must be provided for update.",
        });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-AssociateUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteAssociate(
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
      await logError(error, req, "Middleware-AssociateDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async getAssociate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res
          .status(400)
          .json({ error: "ID must be provided to retrieve an associate." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-AssociateGet");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default AssociateMiddleware;

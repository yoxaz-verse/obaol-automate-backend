import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class EmployeeMiddleware {
  public async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res
          .status(400)
          .json({ error: "Missing required fields: name is required." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-EmployeeCreate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      // const { name } = req.body;
      // if (!name) {
      //   res.status(400).json({ error: "At least one field (name) must be provided for update." });
      //   return;
      // }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-EmployeeUpdate");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async deleteEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-EmployeeDelete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default EmployeeMiddleware;

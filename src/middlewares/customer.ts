import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class CustomerMiddleware {
  public async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;
      if (!email || !name || !password) {
        res.sendError(
          "ValidationError: Email, Name, and Password must be provided",
          "Email, Name, and Password must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;
      if (!email && !name && !password) {
        res.sendError(
          "ValidationError: At least one field (Email, Name, or Password) must be provided",
          "At least one field (Email, Name, or Password) must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default CustomerMiddleware;

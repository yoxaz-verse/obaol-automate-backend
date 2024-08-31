import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ManagerMiddleware {
  public async createManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin } = req.body;
      if (!email || !name || !password || !admin) {
        res.sendError(
          "ValidationError: Email, Name, Password, and Admin must be provided",
          "Email, Name, Password, and Admin must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin } = req.body;
      if (!email && !name && !password && !admin) {
        res.sendError(
          "ValidationError: Email, Name, Password, and Admin must be provided",
          "Email, Name, Password, and Admin must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteManager(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ManagerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getManager(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ManagerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ManagerMiddleware;

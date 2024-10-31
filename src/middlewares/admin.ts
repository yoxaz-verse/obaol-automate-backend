import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class AdminMiddleware {

  public async validateLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.sendError(
          "ValidationError: Email and Password are required",
          "Email and Password are required",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateLogin");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.sendError(
          "ValidationError: Name, Email, and Password are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      // Add more validation as needed (e.g., email format, password strength)
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, isSuperAdmin, isActive, isDeleted } = req.body;
      if (!name && !email && !password && isSuperAdmin === undefined && isActive === undefined && isDeleted === undefined) {
        res.sendError(
          "ValidationError: At least one field must be provided for update",
          "At least one field must be provided for update",
          400
        );
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "AdminMiddleware-validateDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "AdminMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default AdminMiddleware;

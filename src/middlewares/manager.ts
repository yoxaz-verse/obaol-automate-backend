// src/middlewares/manager.ts

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ManagerMiddleware {
  public async createManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin, fileId, fileURL } = req.body;
      if (!email || !name || !password || !admin || !fileId || !fileURL) {
        res.sendError(
          "error",
          "Email, Name, Password, Admin,  fileId, and fileURL must be provided",
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
      const { email, name, password, admin,  fileId, fileURL } = req.body;
      if (
        !email &&
        !name &&
        !password &&
        !admin &&
        !fileId &&
        !fileURL
      ) {
        res.sendError(
          "error",
          "At least one field (Email, Name, Password, Admin, Role, fileId, or fileURL) must be provided",
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
        res.sendError(id, "ID must be provided", 400);
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
        res.sendError(id, "ID must be provided", 400);
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

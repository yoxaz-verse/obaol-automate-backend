import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class WorkerMiddleware {
  public async createWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, serviceCompany } = req.body;
      if (!email || !name || !password || !serviceCompany) {
        res.sendError(
          "ValidationError: Email, Name, Password, and ServiceCompany must be provided",
          "Email, Name, Password, and ServiceCompany must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-WorkerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, serviceCompany } = req.body;
      if (!email && !name && !password && !serviceCompany) {
        res.sendError(
          "ValidationError: Email, Name, Password, and ServiceCompany must be provided",
          "Email, Name, Password, and ServiceCompany must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-WorkerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteWorker(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-WorkerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getWorker(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-WorkerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default WorkerMiddleware;

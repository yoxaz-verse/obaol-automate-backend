import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ServiceCompanyMiddleware {
  public async createServiceCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address } = req.body;
      if (!name || !address) {
        res.sendError(
          "ValidationError: Name and Address must be provided",
          "Name and Address must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ServiceCompanyCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateServiceCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address } = req.body;
      if (!name && !address) {
        res.sendError(
          "ValidationError: Name and Address must be provided",
          "Name and Address must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ServiceCompanyUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteServiceCompany(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ServiceCompanyDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getServiceCompany(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ServiceCompanyGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ServiceCompanyMiddleware;

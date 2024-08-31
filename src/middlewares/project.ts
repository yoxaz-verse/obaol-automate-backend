import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectMiddleware {
  public async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, customer, admin, manager, status } = req.body;
      if (!title || !description || !customer || !admin || !manager || !status) {
        res.sendError(
          "ValidationError: Title, Description, Customer, Admin, Manager, and Status must be provided",
          "Title, Description, Customer, Admin, Manager, and Status must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, customer, admin, manager, status } = req.body;
      if (!title && !description && !customer && !admin && !manager && !status) {
        res.sendError(
          "ValidationError: Title, Description, Customer, Admin, Manager, or Status must be provided",
          "Title, Description, Customer, Admin, Manager, or Status must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteProject(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getProject(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectMiddleware;

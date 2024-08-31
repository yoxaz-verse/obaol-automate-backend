import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityMiddleware {
  public async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, project, budget, forecastDate, actualDate, targetDate, status, customer } = req.body;
      if (!title || !description || !project || !budget || !forecastDate || !actualDate || !targetDate || !status || !customer) {
        res.sendError(
          "ValidationError: Title, Description, Project, Budget, ForecastDate, ActualDate, TargetDate, Status, and Customer must be provided",
          "Title, Description, Project, Budget, ForecastDate, ActualDate, TargetDate, Status, and Customer must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, project, budget, forecastDate, actualDate, targetDate, status, customer } = req.body;
      if (!title && !description && !project && !budget && !forecastDate && !actualDate && !targetDate && !status && !customer) {
        res.sendError(
          "ValidationError: Title, Description, Project, Budget, ForecastDate, ActualDate, TargetDate, Status, or Customer must be provided",
          "Title, Description, Project, Budget, ForecastDate, ActualDate, TargetDate, Status, or Customer must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteActivity(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getActivity(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityMiddleware;

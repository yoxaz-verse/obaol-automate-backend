import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class TimesheetMiddleware {
  public async createTimesheet(req: Request, res: Response, next: NextFunction) {
    try {
      const { activity, worker, manager, startTime, endTime, file } = req.body;
      if (!activity || !worker || !manager || !startTime || !endTime || !file) {
        res.sendError(
          "ValidationError: Activity, Worker, Manager, StartTime, EndTime, and File must be provided",
          "Activity, Worker, Manager, StartTime, EndTime, and File must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-TimesheetCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateTimesheet(req: Request, res: Response, next: NextFunction) {
    try {
      const { activity, worker, manager, startTime, endTime, file } = req.body;
      if (!activity && !worker && !manager && !startTime && !endTime && !file) {
        res.sendError(
          "ValidationError: At least one of Activity, Worker, Manager, StartTime, EndTime, or File must be provided",
          "At least one of Activity, Worker, Manager, StartTime, EndTime, or File must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-TimesheetUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteTimesheet(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-TimesheetDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getTimesheet(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-TimesheetGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default TimesheetMiddleware;

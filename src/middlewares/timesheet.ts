import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class TimesheetMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("HI");
      const { activity, startTime, endTime, date } = req.body;
      const createdBy = req.user?.id; // ID of the logged-in user
      const createdByRole = req.user?.role; // Role of the logged-in user
      console.log("HI YO YO");

      if (!activity || !startTime || !endTime || !date) {
        res.sendError(
          "ValidationError: Activity, StartTime, EndTime,  Date are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      console.log("HI createdBy");

      next();
    } catch (error) {
      await logError(error, req, "TimesheetMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        activity,
        worker,
        manager,
        startTime,
        endTime,
        hoursSpent,
        date,
        file,
        isPending,
        isRejected,
        isAccepted,
        isResubmitted,
        rejectionReason,
        isDeleted,
        isActive,
      } = req.body;
      if (
        !activity &&
        !worker &&
        !manager &&
        !startTime &&
        !endTime &&
        !hoursSpent &&
        !date &&
        !file &&
        isPending === undefined &&
        isRejected === undefined &&
        isAccepted === undefined &&
        isResubmitted === undefined &&
        !rejectionReason &&
        isDeleted === undefined &&
        isActive === undefined
      ) {
        res.sendError(
          "ValidationError: At least one field must be provided for update",
          "At least one field must be provided for update",
          400
        );
        return;
      }
      // Additional validation can be added here
      next();
    } catch (error) {
      await logError(error, req, "TimesheetMiddleware-validateUpdate");
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
      await logError(error, req, "TimesheetMiddleware-validateDelete");
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
      await logError(error, req, "TimesheetMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default TimesheetMiddleware;

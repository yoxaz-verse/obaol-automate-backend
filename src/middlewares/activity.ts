import { Request, Response, NextFunction } from "express";
import { ActivityModel } from "../database/models/activity";
import mongoose from "mongoose";

class ActivityMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    // Validate request for creating an activity
    // Add your validation logic here
    next();
  }
  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    // Check if activity ID is provided
    if (!id) {
      return res.status(400).json({ error: "Activity ID is required." });
    }

    // Check if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid activity ID format." });
    }

    try {
      // Check if the activity exists in the database
      const activity = await ActivityModel.findById(id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found." });
      }

      // Activity exists and is valid, proceed to the next middleware or route handler
      next();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
  // Middleware to validate bulk activity data
  validateBulkActivities = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const activities = req.body;

    // Ensure activities is an array
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        message: "Invalid or empty activities array",
        invalidRows: [],
      });
    }

    const invalidRows: Array<any> = [];

    activities.forEach((activity, index) => {
      const errors: string[] = [];

      // Validate required fields for each activity
      if (!activity.project) {
        errors.push("Missing project");
      }
      if (!activity.activityManager) {
        errors.push("Missing activity manager");
      }
      if (!activity.type) {
        errors.push("Missing activity type");
      }
      if (!activity.worker || activity.worker.length === 0) {
        errors.push("Missing worker(s)");
      }

      // If there are any errors, add them to the invalidRows array
      if (errors.length > 0) {
        invalidRows.push({ row: index + 1, issues: errors });
      }
    });

    // If there are any invalid rows, send a formatted response
    if (invalidRows.length > 0) {
      return res.status(400).json({
        message: "Bulk validation failed. Invalid rows found.",
        invalidRows,
      });
    }

    // If everything is valid, continue to the next handler
    next();
  };

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Activity ID is required." });
    }
    // Add additional validation if necessary
    next();
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Activity ID is required." });
    }
    next();
  }
}

export default ActivityMiddleware;

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

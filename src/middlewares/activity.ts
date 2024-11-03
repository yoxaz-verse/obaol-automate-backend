import { Request, Response, NextFunction } from "express";
import { ActivityModel } from "../database/models/activity";

class ActivityMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    // Validate request for creating an activity
    // Add your validation logic here
    next();
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Activity ID is required." });
    }
    // Add additional validation if necessary
    next();
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

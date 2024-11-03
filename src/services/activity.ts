import { Request, Response } from "express";
import ActivityRepository from "../database/repositories/activity";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";

class ActivityService {
  private activityRepository = new ActivityRepository();

  public async getActivities(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activities = await this.activityRepository.getActivities(
        req,
        pagination,
        search
      );
      res.sendFormatted(activities, "Activities retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-getActivities");
      res.sendError(error, "Failed to retrieve activities", 500);
    }
  }

  public async getActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activity = await this.activityRepository.getActivity(req, id);
      res.sendFormatted(activity, "Activity retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-getActivity");
      res.sendError(error, "Failed to retrieve activity", 500);
    }
  }

  public async createActivity(req: Request, res: Response) {
    try {
      const activityData = req.body;
      const newActivity = await this.activityRepository.createActivity(
        req,
        activityData
      );
      res.sendFormatted(newActivity, "Activity created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityService-createActivity");
      res.sendError(error, "Activity creation failed", 500);
    }
  }

  public async updateActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityData = req.body;
      const updatedActivity = await this.activityRepository.updateActivity(
        req,
        id,
        activityData
      );
      res.sendFormatted(updatedActivity, "Activity updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-updateActivity");
      res.sendError(error, "Activity update failed", 500);
    }
  }

  public async deleteActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivity = await this.activityRepository.deleteActivity(
        req,
        id
      );
      res.sendFormatted(deletedActivity, "Activity deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-deleteActivity");
      res.sendError(error, "Activity deletion failed", 500);
    }
  }
}

export default ActivityService;

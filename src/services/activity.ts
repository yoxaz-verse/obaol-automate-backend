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

      const { projectId, status } = req.query; // Optional project and status filters
      const userId = req.user?.id; // User ID from middleware
      const userRole = req.user?.role; // User Role from middleware
      console.log(userRole);

      const filters: any = {};

      // Add project-based filtering
      if (projectId) {
        filters.project = projectId;
      }

      // Add status-based filtering
      if (status) {
        filters.status = status;
      }

      // Role-based filtering
      if (userRole === "Customer") {
        filters.customer = userId; // Customers see their activities
      } else if (userRole === "ActivityManager" || userRole === "Worker") {
        filters.workers = { $in: [userId] }; // ActivityManager/Worker see assigned activities
      } else if (userRole === "ProjectManager") {
        if (!projectId) {
          filters["project.projectManager"] = userId; // ProjectManager sees their managed activities
        }
      } else if (userRole === "Admin") {
        // Admins see all activities
      } else {
        return res.status(403).send({ message: "Access denied" });
      }

      const activities = await this.activityRepository.getActivities(
        req,
        pagination,
        search,
        filters
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
      res.json(activity);
    } catch (error) {
      await logError(error, req, "ActivityService-getActivity");
      res.sendError(error, "Failed to retrieve activity", 500);
    }
  }

  public async createActivity(req: Request, res: Response) {
    try {
      const activityData = req.body;

      // Set default values
      activityData.hoursSpent = 0;
      activityData.updatedBy = req.user?.role;

      // Set initial status
      let status;
      if (!activityData.targetOperationDate) {
        status = "6752d3c4c3e6e2bbc4769eae"; // No Target Status
      } else if (!activityData.forecastDate) {
        status = "675175dd21b483f14e02b7ee"; // To Be Planned
      } else if (!activityData.worker || activityData.worker.length === 0) {
        status = "675175d221b483f14e02b7ec"; // To Be Assigned
      } else {
        status = "675175ea21b483f14e02b7f0"; // In Progress
      }
      activityData.status = status;

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

      // Update 'updatedBy' field
      activityData.updatedBy = req.user?.role;

      // Retrieve the current activity
      const currentActivity = await this.activityRepository.getActivity(
        req,
        id
      );

      // Determine status transitions
      if (activityData.fileSubmitted) {
        activityData.status = "6751760121b483f14e02b7fa"; // Submitted
      } else if (activityData.customerApproved) {
        activityData.status = "6751777221b483f14e02b838"; // Approved
      } else if (activityData.customerRejected) {
        activityData.status = "6751778921b483f14e02b83a"; // Rejected
      } else if (req.user?.role === "ActivityManager" && activityData.suspend) {
        activityData.status = "6751781121b483f14e02b840"; // Suspended
      } else if (
        req.user?.role === "Admin" &&
        activityData.unblock &&
        currentActivity
      ) {
        activityData.status = currentActivity.previousStatus; // Revert to previous status
      } else {
        // Other logic for status updates based on field changes
        if (!activityData.forecastDate) {
          activityData.status = "675175dd21b483f14e02b7ee"; // To Be Planned
        } else if (!activityData.worker || activityData.worker.length === 0) {
          activityData.status = "675175d221b483f14e02b7ec"; // To Be Assigned
        } else if (
          activityData.forecastDate &&
          activityData.worker?.length > 0
        ) {
          activityData.status = "675175ea21b483f14e02b7f0"; // In Progress
        }
      }

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

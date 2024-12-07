import { Request, Response } from "express";
import ActivityRepository from "../database/repositories/activity";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";
import { ActivityStatusModel } from "../database/models/activityStatus";

class ActivityService {
  private activityRepository = new ActivityRepository();

  /**
   * Fetch a paginated list of activities with dynamic filters based on the user's role.
   */
  public async getActivities(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);

      const { status, projectId } = req.query; // Optional project and status filters
      const userId = req.user?.id; // User ID from middleware
      const userRole = req.user?.role; // User Role from middleware
      const projectIdString =
        typeof projectId === "string" ? projectId : undefined;
      const statusString = typeof status === "string" ? status : undefined;

      const filters = this.getFilters(
        userRole,
        userId,
        projectIdString,
        statusString
      );

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

  /**
   * Fetch a single activity by its ID.
   */
  public async getActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activity = await this.activityRepository.getActivity(req, id);

      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      res.json(activity);
    } catch (error) {
      await logError(error, req, "ActivityService-getActivity");
      res.sendError(error, "Failed to retrieve activity", 500);
    }
  }

  /**
   * Create a new activity with appropriate default values and status.
   */
  public async createActivity(req: Request, res: Response) {
    try {
      const activityData = this.initializeActivityData(req);

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

  /**
   * Update an existing activity with dynamic status transitions and validation.
   */
  public async updateActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityData = req.body;

      activityData.updatedBy = req.user?.role;

      const currentActivity = await this.activityRepository.getActivity(
        req,
        id
      );
      if (!currentActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      if (activityData.status) {
        const isValidStatus = await this.validateStatus(activityData.status);
        if (!isValidStatus) {
          return res
            .status(400)
            .json({ message: "Invalid or inactive status ID provided" });
        }
      } else {
        activityData.status = this.determineNewStatus(
          activityData,
          currentActivity,
          req.user?.role
        );
      }

      if (currentActivity.status !== activityData.status) {
        activityData.previousStatus = currentActivity.status;
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

  /**
   * Delete an activity by its ID.
   */
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

  /**
   * Dynamically build filters based on user role and query parameters.
   */
  private getFilters(
    userRole: string | undefined,
    userId: string | undefined,
    projectId: string | undefined,
    status: string | undefined
  ): Record<string, any> {
    const filters: any = {};

    // Handle projectId properly with type casting
    if (projectId && typeof projectId === "string") {
      filters.project = projectId;
    }

    if (status) filters.status = status;

    if (userRole) {
      switch (userRole) {
        case "Customer":
          filters.customer = userId;
          break;
        case "ActivityManager":
        case "Worker":
          filters.workers = { $in: [userId] };
          break;
        case "ProjectManager":
          if (!projectId) filters["project.projectManager"] = userId;
          break;
        case "Admin":
          break;
        default:
          throw new Error("Access denied");
      }
    }

    return filters;
  }

  /**
   * Initialize default values for a new activity.
   */
  private initializeActivityData(req: Request): any {
    const activityData = req.body;

    activityData.hoursSpent = 0;
    activityData.updatedBy = req.user?.role;

    const statusMap = {
      noTarget: "6752d3c4c3e6e2bbc4769eae",
      toBePlanned: "675175dd21b483f14e02b7ee",
      toBeAssigned: "675175d221b483f14e02b7ec",
      inProgress: "675175ea21b483f14e02b7f0",
    };

    if (!activityData.targetOperationDate) {
      activityData.status = statusMap.noTarget;
    } else if (!activityData.forecastDate) {
      activityData.status = statusMap.toBePlanned;
    } else if (!activityData.worker || activityData.worker.length === 0) {
      activityData.status = statusMap.toBeAssigned;
    } else {
      activityData.status = statusMap.inProgress;
    }

    return activityData;
  }

  /**
   * Validate if a given status ID is active and valid.
   */
  private async validateStatus(statusId: string): Promise<boolean> {
    const statusExists = await ActivityStatusModel.exists({
      _id: statusId,
      isActive: true,
    });
    return !!statusExists;
  }

  /**
   * Determine the new status based on activity data and user role.
   */
  private determineNewStatus(
    activityData: any,
    currentActivity: any,
    userRole?: string
  ): string {
    const statusMap = {
      submitted: "675175ea21b483f14e02b7ef",
      approved: "675175ea21b483f14e02b7f1",
      rejected: "675175ea21b483f14e02b7f2",
      suspended: "675175ea21b483f14e02b7f3",
      created: "675175ea21b483f14e02b7f4",
      toBePlanned: "675175dd21b483f14e02b7ee",
      toBeAssigned: "675175d221b483f14e02b7ec",
      inProgress: "675175ea21b483f14e02b7f0",
    };

    if (activityData.fileSubmitted) {
      return statusMap.submitted;
    } else if (activityData.customerApproved) {
      return statusMap.approved;
    } else if (activityData.customerRejected) {
      return statusMap.rejected;
    } else if (
      ["ActivityManager", "ProjectManager", "Admin"].includes(userRole || "") &&
      activityData.suspend
    ) {
      return statusMap.suspended;
    } else if (userRole === "Admin" && activityData.unblock) {
      return currentActivity.previousStatus || statusMap.created;
    } else if (!activityData.forecastDate) {
      return statusMap.toBePlanned;
    } else if (!activityData.worker || activityData.worker.length === 0) {
      return statusMap.toBeAssigned;
    } else {
      return statusMap.inProgress;
    }
  }
}

export default ActivityService;

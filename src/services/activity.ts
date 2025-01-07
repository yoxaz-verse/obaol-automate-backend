import { Request, Response } from "express";
import ActivityRepository from "../database/repositories/activity";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";
import { ActivityStatusModel } from "../database/models/activityStatus";
import ProjectRepository from "../database/repositories/project";
import { ProjectModel } from "../database/models/project";
import { ActivityManagerModel } from "../database/models/activityManager";
import { ActivityTypeModel } from "../database/models/activityType";
import { WorkerModel } from "../database/models/worker";
import { IWorker } from "../interfaces/worker";

class ActivityService {
  private activityRepository = new ActivityRepository();
  private projectRepository = new ProjectRepository();
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
   * Update an existing activity's status and trigger project status update if necessary.
   */
  public async updateActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityData = req.body;

      activityData.updatedBy = req.user?.role;

      // Fetch the current activity
      const currentActivity = await this.activityRepository.getActivity(
        req,
        id
      );
      if (!currentActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Update activity status
      if (activityData.status) {
        const isValidStatus = await this.validateStatus(activityData.status);
        if (!isValidStatus) {
          return res
            .status(400)
            .json({ message: "Invalid status ID provided" });
        }
      }

      // Save the current status if it’s changed
      if (currentActivity.status !== activityData.status) {
        activityData.previousStatus = currentActivity.status;
      }

      // Update the activity in the database
      const updatedActivity = await this.activityRepository.updateActivity(
        req,
        id,
        activityData
      );

      // Trigger project status update if the activity status changes
      await this.updateProjectStatusForActivity(
        req,
        currentActivity,
        activityData.status
      );

      res.sendFormatted(updatedActivity, "Activity updated successfully", 200);
    } catch (error) {
      console.error(error);
      res.sendError(error, "Activity update failed", 500);
    }
  }

  /**
   * Trigger an update to the associated project's status when an activity's status is updated.
   */
  private async updateProjectStatusForActivity(
    req: Request,
    currentActivity: any,
    newActivityStatus: string
  ) {
    try {
      const projectId = currentActivity.project.toString();

      // If the new status of the activity is "Suspended" or "Blocked," set the project status to the same
      const projectStatus =
        newActivityStatus === "Suspended" || newActivityStatus === "Blocked"
          ? newActivityStatus
          : "Open"; // Otherwise, set the project status to "Open"

      // Update project status
      await this.projectRepository.updateProjectStatus(
        req,
        projectId,
        projectStatus
      );
      console.log(`Project ${projectId} status updated to ${projectStatus}`);
    } catch (error) {
      console.error("Error updating project status:", error);
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

  public async bulkCreateActivities(req: Request, res: Response) {
    try {
      const activities = req.body;

      if (!Array.isArray(activities) || activities.length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid or empty activities array" });
      }

      const results = await Promise.all(
        activities.map(async (activity) => {
          try {
            // Fetch related IDs
            const projectId = await this.getProjectId(activity.project);
            const activityManagerId = await this.getActivityManagerId(
              activity.activityManager
            );
            const activityTypeId = await this.getActivityTypeId(activity.type);
            const workers = JSON.parse(activity.worker);
            const workerIds = await this.getWorkerIds(workers);

            // Initialize and validate activity data
            const activityData = this.initializeActivityData({
              body: {
                ...activity,
                project: projectId,
                activityManager: activityManagerId,
                type: activityTypeId,
                worker: workerIds,
              },
              user: req.user,
            });

            // Validate status
            const isValidStatus = await this.validateStatus(
              activityData.status
            );
            if (!isValidStatus) {
              activityData.status = await this.determineNewStatus(
                activityData,
                null,
                req.user?.role
              );
            }

            // Create activity
            const newActivity = await this.activityRepository.createActivity(
              req,
              activityData
            );

            return { success: true, data: newActivity };
          } catch (err) {
            await logError(err, req, "ActivityService-bulkCreateActivities");
            return { success: false, error: err };
          }
        })
      );

      const successfulActivities = results
        .filter((result) => result.success)
        .map((result) => result.data);
      const failedActivities = results
        .filter((result) => !result.success)
        .map((result) => result.error);

      res.sendFormatted(
        { successfulActivities, failedActivities },
        "Bulk upload completed with results",
        200
      );
    } catch (error) {
      await logError(error, req, "ActivityService-bulkCreateActivities");
      res.sendError(error, "Bulk upload failed", 500);
    }
  }

  private async getProjectId(customId: string): Promise<string> {
    const project = await ProjectModel.findOne({ customId });
    if (!project)
      throw new Error(`Project with customId ${customId} not found`);
    return project._id.toString();
  }
  private async getActivityManagerId(email: string): Promise<string> {
    const manager = await ActivityManagerModel.findOne({ email });
    if (!manager)
      throw new Error(`ActivityManager with name ${name} not found`);
    return manager._id.toString();
  }

  private async getActivityTypeId(name: string): Promise<string | null> {
    const activityType = await ActivityTypeModel.findOne({ name });
    if (!activityType)
      throw new Error(`ActivityType with name ${name} not found`);
    return activityType._id.toString();
  }
  private async getWorkerIds(emails: string[]): Promise<string[]> {
    const workers = await WorkerModel.find({ email: { $in: emails } }).lean<
      IWorker[]
    >();

    const foundEmails = workers.map((worker) => worker.email);
    const missingEmails = emails.filter(
      (email) => !foundEmails.includes(email)
    );

    if (missingEmails.length) {
      console.warn(`Missing workers: ${missingEmails.join(", ")}`);
    }

    return workers.map((worker) => worker._id);
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

    if (projectId) {
      filters.project = projectId; // Filter by project ID if provided
    }

    if (status) {
      filters.status = status; // Filter by status if provided
    }

    if (userRole) {
      switch (userRole) {
        case "Customer":
          filters.customer = userId; // Activities associated with the customer
          break;
        case "ActivityManager":
          filters.activityManager = userId; // Activities managed by the user
          break;
        case "Worker":
          filters.worker = { $in: [userId] }; // Activities assigned to the worker
          break;
        case "ProjectManager":
          filters["project.projectManager"] = userId; // Projects managed by the user
          break;
        case "Admin":
          // No filters for Admins (they can view all activities)
          break;
        default:
          throw new Error("Access denied");
      }
    }

    return filters;
  }

  private statusCache: Record<string, string> = {};

  /**
   * Get the status ID by its name, caching results for performance.
   */
  private async getStatusIdByName(statusName: string): Promise<string> {
    if (this.statusCache[statusName]) {
      return this.statusCache[statusName];
    }

    const status = await ActivityStatusModel.findOne({ name: statusName });
    if (!status) {
      throw new Error(`Status with name "${statusName}" not found`);
    }

    this.statusCache[statusName] = status._id.toString();
    return this.statusCache[statusName];
  }

  /**
   * Initialize default values for a new activity.
   */
  private initializeActivityData(data: { body: any; user?: any }): any {
    const activityData = data.body || {};

    // Ensure required properties are initialized
    if (!activityData.hoursSpent) activityData.hoursSpent = 0;
    if (!activityData.updatedBy && data.user?.role) {
      activityData.updatedBy = data.user.role;
    }

    const statusMap = {
      noTarget: "6752d3c4c3e6e2bbc4769eae",
      toBePlanned: "675175dd21b483f14e02b7ee",
      toBeAssigned: "675175d221b483f14e02b7ec",
      inProgress: "675175ea21b483f14e02b7f0",
    };

    // Determine initial status based on provided data
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
  private async determineNewStatus(
    activityData: any,
    currentActivity: any,
    userRole?: string
  ): Promise<string> {
    // Dynamically fetch the status IDs
    const submittedStatusId = await this.getStatusIdByName("Submitted");
    const approvedStatusId = await this.getStatusIdByName("Approved");
    const rejectedStatusId = await this.getStatusIdByName("Rejected");
    const suspendedStatusId = await this.getStatusIdByName("Suspended");
    const createdStatusId = await this.getStatusIdByName("Created");
    const toBePlannedStatusId = await this.getStatusIdByName("To Be Planned");
    const toBeAssignedStatusId = await this.getStatusIdByName("To Be Assigned");
    const inProgressStatusId = await this.getStatusIdByName("In Progress");

    if (activityData.fileSubmitted) {
      return submittedStatusId;
    } else if (activityData.customerApproved) {
      return approvedStatusId;
    } else if (activityData.customerRejected) {
      return rejectedStatusId;
    } else if (
      ["ActivityManager", "ProjectManager", "Admin"].includes(userRole || "") &&
      activityData.suspend
    ) {
      return suspendedStatusId;
    } else if (userRole === "Admin" && activityData.unblock) {
      return currentActivity.previousStatus || createdStatusId;
    } else if (!activityData.forecastDate) {
      return toBePlannedStatusId;
    } else if (!activityData.worker || activityData.worker.length === 0) {
      return toBeAssignedStatusId;
    } else {
      return inProgressStatusId;
    }
  }
}

export default ActivityService;

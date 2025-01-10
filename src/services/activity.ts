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
import { ProjectStatusModel } from "../database/models/projectStatus";
import { ObjectId } from "mongodb"; // Make sure to import ObjectId
import { ActivityModel } from "../database/models/activity";
import { Types } from "mongoose";

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
      activityData.status = await this.determineActivityStatus(
        activityData,
        null,
        req.user?.role
      );
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

      // Get the current activity
      const currentActivity = await this.activityRepository.getActivity(
        req,
        id
      );
      if (!currentActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Determine the new status based on activity conditions
      const determinedStatus = await this.determineActivityStatus(
        activityData,
        currentActivity,
        req.user?.role
      );

      // Compare and update status only if it differs
      if (currentActivity.status?.toString() !== determinedStatus) {
        activityData.previousStatus = currentActivity.status;
        activityData.status = determinedStatus;
      }

      // Update the activity in the database
      const updatedActivity = await this.activityRepository.updateActivity(
        req,
        id,
        activityData
      );
      // Trigger project status update if the activity status changes
      await this.determineProjectStatus(new ObjectId(id), req);

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
                project: new ObjectId(projectId),
                activityManager: activityManagerId,
                type: activityTypeId,
                worker: workerIds,
              },
              user: req.user,
            });

            activityData.status = await this.determineActivityStatus(
              activityData,
              null,
              req.user?.role
            );
            let newActivity;
            if (activity.customId) {
              // Update existing activity
              newActivity =
                await this.activityRepository.updateActivityByCustomId(
                  req,
                  activity.customId,
                  activityData
                );
            } else {
              // Create new activity
              newActivity = await this.activityRepository.createActivity(
                req,
                activityData
              );
            }
            // Create activity
            // const newActivity = await this.activityRepository.createActivity(
            //   req,
            //   activityData
            // );
            console.log(newActivity);

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
      throw new Error(`Activity Status with name "${statusName}" not found`);
    }

    this.statusCache[statusName] = status._id.toString();
    return this.statusCache[statusName];
  }
  private projectStatusCache: Record<string, string> = {};

  private async getStatusIdByNameProject(
    projectStatusName: string
  ): Promise<string> {
    if (this.projectStatusCache[projectStatusName]) {
      return this.projectStatusCache[projectStatusName];
    }

    const status = await ProjectStatusModel.findOne({
      name: projectStatusName,
    });
    if (!status) {
      throw new Error(
        `Project Status with name "${projectStatusName}" not found`
      );
    }
    this.projectStatusCache[projectStatusName] = status._id.toString();
    return this.projectStatusCache[projectStatusName];
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
  private async getActivitiesByProject(projectId: ObjectId): Promise<any[]> {
    return await ActivityModel.find({ project: projectId });
  }
  private async getActivityStatusNameById(statusId: string): Promise<string> {
    const status = await ActivityStatusModel.findById(statusId);
    return status ? status.name : "";
  }

  /**
   * Determine the new status based on activity data and user role.
   */
  private async determineActivityStatus(
    activityData: any,
    currentActivity?: any,
    userRole?: string
  ): Promise<string> {
    let currentActivityData: any = null;
    if (currentActivity) {
      currentActivityData = currentActivity.toObject
        ? currentActivity.toObject()
        : currentActivity._doc;
    }

    // Merge current activity data with new data
    const filledActivityData = { ...currentActivityData, ...activityData };

    let activityStatus = "";

    // Determine activity status
    if (!filledActivityData.targetOperationDate) {
      activityStatus = await this.getStatusIdByName("No Target");
    } else if (!filledActivityData.forecastDate) {
      activityStatus = await this.getStatusIdByName("To Be Planned");
    } else if (
      !filledActivityData.worker ||
      filledActivityData.worker.length === 0
    ) {
      activityStatus = await this.getStatusIdByName("To Be Assigned");
    } else if (filledActivityData.status === "Submitted") {
      activityStatus = await this.getStatusIdByName("Submitted");
    } else if (filledActivityData.status === "Approved") {
      activityStatus = await this.getStatusIdByName("Approved");
    } else if (filledActivityData.status === "Rejected") {
      activityStatus = await this.getStatusIdByName("Rejected");
    } else if (filledActivityData.status === "Suspended") {
      activityStatus = await this.getStatusIdByName("Suspended");
    } else if (filledActivityData.status === "Blocked") {
      activityStatus = await this.getStatusIdByName("Blocked");
    } else if (userRole === "Admin" && filledActivityData.unblock) {
      activityStatus = currentActivity.previousStatus;
    } else {
      activityStatus = await this.getStatusIdByName("In Progress");
    }

    return activityStatus;
  }

  private async determineProjectStatus(
    activityId: ObjectId,
    req: Request
  ): Promise<void> {
    // Step 1: Fetch the activity by its ID
    const activity = await this.getActivityById(activityId);
    if (!activity || !activity.project) {
      throw new Error("Activity or associated project not found");
    }

    // Step 2: Get the project ID from the activity
    const projectId =
      activity.project instanceof Types.ObjectId
        ? activity.project
        : activity.project._id;

    // Step 3: Fetch all activities associated with the project
    const projectActivities = await this.getActivitiesByProject(projectId);
    if (!projectActivities || projectActivities.length === 0) {
      throw new Error("No activities found for the project");
    }

    // Step 4: Fetch status names for comparison
    const statusNames = await Promise.all(
      projectActivities.map(async (activity) => {
        return this.getActivityStatusNameById(activity.status);
      })
    );
    let status: ObjectId;
    // Step 5: Determine project status based on activity statuses

    // Case 1: All activities are approved -> Set project status to "Closed"
    if (statusNames.every((status) => status === "Approved")) {
      console.log(
        "All activities approved. Updating project status to 'Closed'."
      );

      status = new ObjectId(await this.getStatusIdByNameProject("Closed"));
      await this.projectRepository.updateProjectStatus(
        req,
        projectId.toString(),
        status
      );
      return;
    }
    // Case 2: None of the activities are blocked or suspended -> Set project status to "Open"
    if (statusNames.some((status) => ["Suspended"].includes(status))) {
      console.log(
        "Some activities are Suspended. Updating project status to 'Suspended'."
      );

      status = new ObjectId(await this.getStatusIdByNameProject("Suspended"));
      await this.projectRepository.updateProjectStatus(
        req,
        projectId.toString(),
        status
      );
    }
    if (statusNames.some((status) => ["Blocked"].includes(status))) {
      console.log(
        "Some activities are Blocked. Updating project status to 'Blocked'."
      );

      status = new ObjectId(await this.getStatusIdByNameProject("Blocked"));
      await this.projectRepository.updateProjectStatus(
        req,
        projectId.toString(),
        status
      );
    }
    // Case 2: None of the activities are blocked or suspended -> Set project status to "Open"
    if (
      !statusNames.some((status) => ["Suspended", "Blocked"].includes(status))
    ) {
      console.log(
        "No activities are blocked or suspended. Updating project status to 'Open'."
      );

      status = new ObjectId(await this.getStatusIdByNameProject("Open"));
      await this.projectRepository.updateProjectStatus(
        req,
        projectId.toString(),
        status
      );
    }

    console.log("No project status update needed.");
  }

  public async getActivityById(activityId: ObjectId): Promise<any | null> {
    return await ActivityModel.findById(activityId).populate("project").exec();
  }
}

export default ActivityService;

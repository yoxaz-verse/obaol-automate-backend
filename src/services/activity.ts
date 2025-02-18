import { Request, Response } from "express";
import ActivityRepository from "../database/repositories/activity";
import { paginationHandler } from "../utils/paginationHandler";
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
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import StatusHistoryService from "./statusHistory";
import { convertChangedFields } from "../utils/formatChangedFields";

class ActivityService {
  private activityRepository = new ActivityRepository();
  private projectRepository = new ProjectRepository();
  private statusHistoryService = new StatusHistoryService(); // ✅ Initialize Status History Service
  // Define the field-to-model mapping
  private fieldModelMapping = {
    status: ActivityStatusModel,
    project: ProjectModel,
    activityManager: ActivityManagerModel,
    type: ActivityTypeModel,
    worker: WorkerModel,
  };

  /**
   * Get activity count by status for a specific project.
   */
  public async getActivityCountByStatus(req: Request, res: Response) {
    try {
      const { projectId, ...filters } = req.query; // Optional project and status filters

      const userId = req.user?.id; // User ID from middleware
      const userRole = req.user?.role; // User Role from middleware
      const projectIdString =
        typeof projectId === "string" ? projectId : undefined;
      // const statusString = typeof status === "string" ? status : undefined;

      const roleQuery = this.getFilters(
        userRole,
        userId,
        projectIdString
        // statusString
      );
      const dynamicQuery = buildDynamicQuery(filters); // Build dynamic query using filters
      const finalQuery = { ...roleQuery, ...dynamicQuery };

      const counts = await this.activityRepository.getActivityCountByStatus(
        finalQuery
      );

      res.sendFormatted(
        counts,
        "Activity counts by status retrieved successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "ActivityService-getActivityCountByStatus");
      res.sendError(error, "Failed to retrieve activity counts by status", 500);
    }
  }

  /**
   * Fetch a paginated list of activities with dynamic filters based on the user's role.
   */
  public async getActivities(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);

      const { status, projectId, page, limit, ...filters } = req.query; // Optional project and status filters
      if (!req.user) {
        throw new Error("User  is missing.");
      }
      const userId = req.user.id; // User ID from middleware
      const userRole = req.user.role; // User Role from middleware
      const projectIdString =
        typeof projectId === "string" ? projectId : undefined;
      const statusString = typeof status === "string" ? status : undefined;

      const roleQuery = await this.getFilters(
        userRole,
        userId,
        projectIdString,
        statusString
      );

      const dynamicQuery = buildDynamicQuery(filters); // Build dynamic query using filters
      const finalQuery = { ...roleQuery, ...dynamicQuery };

      const activities = await this.activityRepository.getActivities(
        req,
        pagination,
        finalQuery
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
   * Create a new activity with status history logging.
   */
  public async createActivity(req: Request, res: Response) {
    try {
      let activityData = req.body;

      // Ensure `updatedBy` is set
      if (!activityData.updatedBy && req.user?.role) {
        activityData.updatedBy = req.user.role;
      }

      // Convert IDs to ObjectIds
      if (activityData.project) {
        activityData.project = new Types.ObjectId(activityData.project);
      }
      if (activityData.activityManager) {
        activityData.activityManager = new Types.ObjectId(
          activityData.activityManager
        );
      }
      if (activityData.type) {
        activityData.type = new Types.ObjectId(activityData.type);
      }
      if (activityData.worker && Array.isArray(activityData.worker)) {
        activityData.worker = activityData.worker.map(
          (id: string) => new Types.ObjectId(id)
        );
      }

      // Determine status dynamically
      activityData.status = await this.determineActivityStatus(
        activityData,
        null,
        req.user?.role
      );

      // Replace IDs with names in changedFields
      const changedFields = await convertChangedFields(
        activityData,
        {},
        this.fieldModelMapping
      );

      // Create the activity
      const newActivity = await this.activityRepository.createActivity(
        req,
        activityData
      );
      if (!newActivity || !newActivity._id) {
        return res.sendError(null, "Activity creation failed", 500);
      }

      // Log status history
      const changedBy = req.user?.id ?? "Unknown User";
      const changedRole =
        (req.user?.role as
          | "Admin"
          | "ProjectManager"
          | "ActivityManager"
          | "Worker") ?? "Worker";

      // const changedFields = Object.keys(activityData).map((key) => ({
      //   field: key,
      //   oldValue: null,
      //   newValue: key === "status" ? newActivity.status : activityData[key],
      // }));

      await this.statusHistoryService.logStatusChange(
        newActivity._id.toString(),
        "Activity",
        changedBy,
        changedRole,
        null, // No previous status
        "Created", // New determined status
        changedFields,
        "Created"
      );

      res.sendFormatted(newActivity, "Activity created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityService-createActivity");
      res.sendError(error, "Activity creation failed", 500);
    }
  }

  /**
   * Update an existing activity and log status history.
   */
  public async updateActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityData = req.body;

      // Fetch the previous activity details
      const previousActivity = await this.activityRepository.getActivity(
        req,
        id
      );
      if (!previousActivity || !previousActivity._id) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Determine the new status dynamically
      activityData.status = await this.determineActivityStatus(
        activityData,
        previousActivity,
        req.user?.role
      );

      // Update the activity
      const updatedActivity = await this.activityRepository.updateActivity(
        req,
        id,
        activityData
      );
      if (!updatedActivity || !updatedActivity._id) {
        return res.status(500).json({ message: "Activity update failed" });
      }

      // Log the status change
      const changedBy = req.user?.id || "Unknown User";
      const changedRole = req.user?.role || "Worker";

      // Get the changed fields with old and new values
      const changedFields = await convertChangedFields(
        activityData,
        previousActivity,
        this.fieldModelMapping
      );

      // Log status change only if there are changed fields
      if (changedFields.length > 0) {
        await this.statusHistoryService.logStatusChange(
          updatedActivity._id.toString(),
          "Activity",
          changedBy,
          changedRole,
          "N/A",
          "Updated Activity",
          changedFields,
          "Updated"
        );
      }

      res.status(200).json({
        message: "Activity updated successfully",
        data: updatedActivity,
      });
    } catch (error) {
      await logError(error, req, "ActivityService-updateActivity");
      res.status(500).json({ message: "Activity update failed", error });
    }
  }

  /**
   * Delete an activity and log its deletion.
   */
  public async deleteActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Fetch the activity before deletion
      const deletedActivity = await this.activityRepository.getActivity(
        req,
        id
      );
      if (!deletedActivity || !deletedActivity._id) {
        return res.sendError(null, "Activity not found", 404);
      }

      // Perform soft delete (mark as isDeleted: true)
      await this.activityRepository.deleteActivity(req, id);

      const changedBy = req.user?.id ?? "Unknown User";
      const changedRole =
        (req.user?.role as
          | "Admin"
          | "ProjectManager"
          | "ActivityManager"
          | "Worker") ?? "Worker";

      // Convert existing activity fields into log format before deletion
      const changedFields = Object.keys(deletedActivity).map((key) => ({
        field: key,
        oldValue: deletedActivity[key as keyof typeof deletedActivity],
        newValue: null, // Deleted fields are now null
      }));

      // Log deletion event
      await this.statusHistoryService.logStatusChange(
        deletedActivity._id.toString(),
        "Activity",
        changedBy,
        changedRole,
        null, // No previous status
        "Deleted",
        changedFields,
        "Deleted"
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

      const invalidRows: any[] = [];
      const validActivities: any[] = [];

      // Process each activity to validate and prepare data
      for (const [index, activity] of activities.entries()) {
        const errors: string[] = [];

        try {
          // Validate project ID
          const projectId = await this.getProjectId(activity.project);
          if (!projectId)
            errors.push(`Invalid project ID: ${activity.project}`);

          // Validate activity type ID
          const activityTypeId = await this.getActivityTypeId(activity.type);
          if (!activityTypeId)
            errors.push(`Invalid activity type ID: ${activity.type}`);

          // Validate activity manager ID
          const activityManagerId = await this.getActivityManagerId(
            activity.activityManager
          );
          if (!activityManagerId)
            errors.push(
              `Invalid activity manager: ${activity.activityManager}`
            );

          // Parse and validate workers
          let workerIds: string[] = [];
          try {
            const workers = JSON.parse(activity.worker);
            workerIds = await this.getWorkerIds(workers);
          } catch (e) {
            errors.push(`Invalid worker data: ${activity.worker}`);
          }

          // If there are validation errors, skip this activity
          if (errors.length > 0) {
            invalidRows.push({ row: index + 1, issues: errors });
            continue; // Skip the current activity if it's invalid
          }

          if (!projectId) return;

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

          // Set activity status
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

          // Add valid activity to the list
          validActivities.push(newActivity);
        } catch (err: unknown) {
          // Log the error
          await logError(err, req, "ActivityService-bulkCreateActivities");

          // Add a generic error message for the failed row
          errors.push("Unknown error occurred while processing this activity");
          invalidRows.push({ row: index + 1, issues: errors });
        }
      }

      // If there are invalid rows, return an error response with details
      if (invalidRows.length > 0) {
        return res.status(400).json({
          message: "Bulk upload failed. Invalid rows found.",
          invalidRows, // Send row details with error messages
        });
      }

      // Send successful activities as response
      res.sendFormatted(
        validActivities,
        "Bulk upload completed successfully",
        201
      );
    } catch (error) {
      // Log the error and send a formatted response
      await logError(error, req, "ActivityService-bulkCreateActivities");
      res.sendError(error, "Bulk upload failed", 500);
    }
  }

  private async getProjectId(customId: string): Promise<string | null> {
    const project = await ProjectModel.findOne({ customId });
    if (!project) {
      console.warn(`Project with customId ${customId} not found`);
      return null; // Returning null instead of throwing an error could make this more flexible
    }
    return project._id.toString();
  }
  private async getActivityManagerId(email: string): Promise<string | null> {
    const manager = await ActivityManagerModel.findOne({ email });
    if (!manager) {
      console.warn(`ActivityManager with email ${email} not found`);
      return null; // Return null if not found instead of throwing an error
    }

    return manager._id.toString();
  }

  private async getActivityTypeId(name: string): Promise<string | null> {
    const activityType = await ActivityTypeModel.findOne({ name });
    if (!activityType) {
      console.warn(`ActivityType with name ${name} not found`);
      return null; // Returning null instead of throwing an error for missing types
    }
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
    status?: string | undefined
  ): Record<string, any> {
    const filters: any = {};

    if (projectId) {
      filters.project = new Types.ObjectId(projectId);
    }

    if (status) {
      filters.status = new Types.ObjectId(status);
    }

    if (!userRole || !userId) {
      throw new Error("User role or ID is missing.");
    }

    switch (userRole) {
      case "Customer":
        return this.getProjectIdsForCustomer(userId).then((projects) => ({
          project: { $in: projects },
        }));

      case "ActivityManager":
        filters.activityManager = new Types.ObjectId(userId);
        break;

      case "Worker":
        filters.worker = { $in: [new Types.ObjectId(userId)] };
        break;

      case "ProjectManager":
        return this.getProjectIdsForProjectManager(userId).then((projects) => ({
          project: { $in: projects },
        }));

      case "Admin":
        break; // Admin sees all activities

      default:
        throw new Error("Access denied: Invalid role.");
    }

    return filters;
  }

  /**
   * Fetch project IDs for a given customer.
   */
  private async getProjectIdsForCustomer(
    customerId: string
  ): Promise<Types.ObjectId[]> {
    const projects = await ProjectModel.find(
      { customer: customerId },
      { _id: 1 }
    ).lean();
    return projects.map((p) => p._id);
  }

  /**
   * Fetch project IDs for a given project manager.
   */
  private async getProjectIdsForProjectManager(
    projectManagerId: string
  ): Promise<Types.ObjectId[]> {
    const projects = await ProjectModel.find(
      { projectManager: projectManagerId },
      { _id: 1 }
    ).lean();
    return projects.map((p) => p._id);
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

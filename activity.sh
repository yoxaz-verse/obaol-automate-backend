#!/bin/bash

# Create model
cat <<EOT > src/database/models/activity.ts
import mongoose from "mongoose";
import { ProjectModel } from "./project";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { CustomerModel } from "./customer";
import { ActivityStatusModel } from "./activityStatus";

interface IActivity extends mongoose.Document {
  title: string;
  description: string;
  project: mongoose.Schema.Types.ObjectId | typeof ProjectModel;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: Array<mongoose.Schema.Types.ObjectId | typeof WorkerModel>;
  updatedBy: mongoose.Schema.Types.ObjectId | typeof WorkerModel | typeof ManagerModel;
  hoursSpent: number;
  statusHistory: Array<mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel>;
  status: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel;
  workCompleteStatus: boolean;
  managerFullStatus: boolean;
  customerStatus: boolean;
  isSubmitted: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string;
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  isPending: boolean;
  isOnHold: boolean;
  isDisabled: boolean;
  isDeleted: boolean;
}

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    budget: { type: Number, required: true },
    forecastDate: { type: Date, required: true },
    actualDate: { type: Date, required: true },
    targetDate: { type: Date, required: true },
    workers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Worker" }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'updatedByModel', required: true },
    hoursSpent: { type: Number, required: true },
    statusHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "ActivityStatus" }],
    status: { type: mongoose.Schema.Types.ObjectId, ref: "ActivityStatus", required: true },
    workCompleteStatus: { type: Boolean, default: false },
    managerFullStatus: { type: Boolean, default: false },
    customerStatus: { type: Boolean, default: false },
    isSubmitted: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    rejectionReason: { type: String, default: "" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    isPending: { type: Boolean, default: true },
    isOnHold: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const ActivityModel = mongoose.model<IActivity>("Activity", ActivitySchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/activity.ts
import { Request } from "express";
import { ActivityModel } from "../models/activity";
import { IActivity, ICreateActivity, IUpdateActivity } from "../../interfaces/activity";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ActivityRepository {
  public async getActivities(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IActivity[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      const activities = await ActivityModel.find(query)
        .populate("project")
        .populate("workers")
        .populate("updatedBy")
        .populate("status")
        .populate("statusHistory")
        .populate("customer")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ActivityModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: activities as IActivity[],
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivities");
      throw error;
    }
  }

  public async getActivityById(req: Request, id: string): Promise<IActivity> {
    try {
      const activity = await ActivityModel.findById(id)
        .populate("project")
        .populate("workers")
        .populate("updatedBy")
        .populate("status")
        .populate("statusHistory")
        .populate("customer")
        .lean();
      if (!activity) {
        throw new Error("Activity not found");
      }
      return activity as IActivity;
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivityById");
      throw error;
    }
  }

  public async createActivity(
    req: Request,
    activityData: ICreateActivity
  ): Promise<IActivity> {
    try {
      const newActivity = await ActivityModel.create(activityData);
      return newActivity.toObject();
    } catch (error) {
      await logError(error, req, "ActivityRepository-createActivity");
      throw error;
    }
  }

  public async updateActivity(
    req: Request,
    id: string,
    activityData: Partial<IUpdateActivity>
  ): Promise<IActivity> {
    try {
      const updatedActivity = await ActivityModel.findByIdAndUpdate(id, activityData, {
        new: true,
      })
      .populate("project")
      .populate("workers")
      .populate("updatedBy")
      .populate("status")
      .populate("statusHistory")
      .populate("customer");
      if (!updatedActivity) {
        throw new Error("Failed to update activity");
      }
      return updatedActivity.toObject();
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivity");
      throw error;
    }
  }

  public async deleteActivity(req: Request, id: string): Promise<IActivity> {
    try {
      const deletedActivity = await ActivityModel.findByIdAndDelete(id);
      if (!deletedActivity) {
        throw new Error("Failed to delete activity");
      }
      return deletedActivity.toObject();
    } catch (error) {
      await logError(error, req, "ActivityRepository-deleteActivity");
      throw error;
    }
  }
}

export default ActivityRepository;
EOT

# Create service
cat <<EOT > src/services/activity.ts
import { Request, Response } from "express";
import ActivityRepository from "../database/repositories/activity";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ActivityService {
  private activityRepository: ActivityRepository;

  constructor() {
    this.activityRepository = new ActivityRepository();
  }

  public async getActivities(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activities = await this.activityRepository.getActivities(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(activities, "Activities retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityService-getActivities");
      res.sendError(error, "Activities retrieval failed");
    }
  }

  public async getActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activity = await this.activityRepository.getActivityById(req, id);
      res.sendFormatted(activity, "Activity retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityService-getActivity");
      res.sendError(error, "Activity retrieval failed");
    }
  }

  public async createActivity(req: Request, res: Response) {
    try {
      const activityData = req.body;
      const newActivity = await this.activityRepository.createActivity(req, activityData);
      res.sendFormatted(newActivity, "Activity created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityService-createActivity");
      res.sendError(error, "Activity creation failed");
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
      res.sendFormatted(updatedActivity, "Activity updated successfully");
    } catch (error) {
      await logError(error, req, "ActivityService-updateActivity");
      res.sendError(error, "Activity update failed");
    }
  }

  public async deleteActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivity = await this.activityRepository.deleteActivity(req, id);
      res.sendFormatted(deletedActivity, "Activity deleted successfully");
    } catch (error) {
      await logError(error, req, "ActivityService-deleteActivity");
      res.sendError(error, "Activity deletion failed");
    }
  }
}

export default ActivityService;
EOT

# Create middleware
cat <<EOT > src/middlewares/activity.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityMiddleware {
  public async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, project, budget, forecastDate, actualDate, targetDate, status, customer } = req.body;
      if (!title || !description || !project || !budget || !forecastDate || !actualDate || !targetDate || !status || !customer) {
        res.sendError(
          "ValidationError: Title, Description, Project, Budget, ForecastDate, ActualDate, TargetDate, Status, and Customer must be provided",
          "Title, Description, Project, Budget, ForecastDate, ActualDate, TargetDate, Status, and Customer must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, project, budget, forecastDate, actualDate, targetDate, status, customer } = req.body;
      if (!title && !description && !project && !budget && !forecastDate && !actualDate && !targetDate && !status && !customer) {
        res.sendError(
          "ValidationError: Title, Description, Project, Budget, ForecastDate, ActualDate, TargetDate, Status, or Customer must be provided",
          "Title, Description, Project, Budget, ForecastDate, ActualDate, TargetDate, Status, or Customer must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteActivity(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getActivity(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/activity.ts
import { IProject } from "./project";
import { IWorker } from "./worker";
import { IManager } from "./manager";
import { ICustomer } from "./customer";
import { IActivityStatus } from "./activityStatus";

export interface IActivity {
  _id: string;
  title: string;
  description: string;
  project: string | IProject;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: string[] | IWorker[];
  updatedBy: string | IWorker | IManager;
  hoursSpent: number;
  statusHistory: string[] | IActivityStatus[];
  status: string | IActivityStatus;
  workCompleteStatus: boolean;
  managerFullStatus: boolean;
  customerStatus: boolean;
  isSubmitted: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string;
  customer: string | ICustomer;
  isPending: boolean;
  isOnHold: boolean;
  isDisabled: boolean;
  isDeleted: boolean;
}

export interface ICreateActivity {
  title: string;
  description: string;
  project: string;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: string[];
  updatedBy: string;
  status: string;
  customer: string;
}

export interface IUpdateActivity {
  title?: string;
  description?: string;
  project?: string;
  budget?: number;
  forecastDate?: Date;
  actualDate?: Date;
  targetDate?: Date;
  workers?: string[];
  updatedBy?: string;
  status?: string;
  customer?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/activityRoute.ts
import { Router } from "express";
import ActivityService from "../services/activity";
import ActivityMiddleware from "../middlewares/activity";

const router = Router();
const activityService = new ActivityService();
const activityMiddleware = new ActivityMiddleware();

router.get(
  "/",
  activityService.getActivities.bind(activityService)
);
router.get(
  "/:id",
  activityMiddleware.getActivity.bind(activityMiddleware),
  activityService.getActivity.bind(activityService)
);
router.post(
  "/",
  activityMiddleware.createActivity.bind(activityMiddleware),
  activityService.createActivity.bind(activityService)
);
router.patch(
  "/:id",
  activityMiddleware.updateActivity.bind(activityMiddleware),
  activityService.updateActivity.bind(activityService)
);
router.delete(
  "/:id",
  activityMiddleware.deleteActivity.bind(activityMiddleware),
  activityService.deleteActivity.bind(activityService)
);

export default router;
EOT

echo "Activity module generated successfully."

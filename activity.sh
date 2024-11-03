#!/bin/bash

# Set directories
BASE_DIR="./src"
MODEL_DIR="$BASE_DIR/models"
REPO_DIR="$BASE_DIR/repositories"
SERVICE_DIR="$BASE_DIR/services"
MIDDLEWARE_DIR="$BASE_DIR/middlewares"
ROUTE_DIR="$BASE_DIR/routes"
UTILS_DIR="$BASE_DIR/utils"

# Create directories if they do not exist
mkdir -p $MODEL_DIR $REPO_DIR $SERVICE_DIR $MIDDLEWARE_DIR $ROUTE_DIR $UTILS_DIR

# Activity Model
echo "Creating activity model..."
cat <<EOL > $MODEL_DIR/activity.ts
import mongoose from "mongoose";
import { ProjectModel } from "./project";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { CustomerModel } from "./customer";
import { ActivityStatusModel } from "./activityStatus";
import { ActivityTypeModel } from "./activityType";

interface IActivity extends mongoose.Document {
  title: string;
  description: string;
  project: mongoose.Schema.Types.ObjectId | typeof ProjectModel;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetOperationDate: Date;
  targetFinanceDate: Date;
  workers: Array<mongoose.Schema.Types.ObjectId | typeof WorkerModel>;
  updatedBy:
    | mongoose.Schema.Types.ObjectId
    | typeof WorkerModel
    | typeof ManagerModel;
  updatedByModel: string; // Field to support refPath
  hoursSpent: number;
  statusHistory: Array<mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel>;
  status: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel;
  type: mongoose.Schema.Types.ObjectId | typeof ActivityTypeModel;
  workCompleteStatus: boolean;
  managerFullStatus: boolean;
  customerStatus: boolean;
  isSubmitted: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string[];
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
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    budget: { type: Number, required: true },
    forecastDate: { type: Date, required: true },
    actualDate: { type: Date, required: true },
    targetFinanceDate: { type: Date, required: true },
    targetOperationDate: { type: Date, required: true },
    workers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Worker" }],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "updatedByModel",
      required: true,
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityType",
      required: true,
    },
    updatedByModel: {
      type: String,
      required: true,
      enum: ["Worker", "Manager"],
    },
    hoursSpent: { type: Number, required: true },
    statusHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ActivityStatus" },
    ],
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityStatus",
      required: true,
    },
    workCompleteStatus: { type: Boolean, default: false },
    managerFullStatus: { type: Boolean, default: false },
    customerStatus: { type: Boolean, default: false },
    isSubmitted: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    rejectionReason: [{ type: String, default: "" }],
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    isPending: { type: Boolean, default: true },
    isOnHold: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ActivityModel = mongoose.model<IActivity>("Activity", ActivitySchema);
EOL

# Activity Repository
echo "Creating activity repository..."
cat <<EOL > $REPO_DIR/activity.ts
import { ActivityModel } from "../models/activity";
import { logError } from "../utils/errorLogger";
import { Request } from "express";

class ActivityRepository {
  public async getActivities(req: Request, pagination: any, search: string) {
    try {
      const query: any = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      return await ActivityModel.find(query)
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .populate("project workers updatedBy status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivities");
      throw error;
    }
  }

  public async getActivity(req: Request, id: string) {
    try {
      return await ActivityModel.findById(id)
        .populate("project workers updatedBy status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivity");
      throw error;
    }
  }

  public async createActivity(req: Request, activityData: any) {
    try {
      const newActivity = new ActivityModel(activityData);
      return await newActivity.save();
    } catch (error) {
      await logError(error, req, "ActivityRepository-createActivity");
      throw error;
    }
  }

  public async updateActivity(req: Request, id: string, activityData: any) {
    try {
      return await ActivityModel.findByIdAndUpdate(id, activityData, {
        new: true,
      })
        .populate("project workers updatedBy status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivity");
      throw error;
    }
  }

  public async deleteActivity(req: Request, id: string) {
    try {
      return await ActivityModel.findByIdAndUpdate(id, { isDeleted: true }, {
        new: true,
      })
        .populate("project workers updatedBy status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-deleteActivity");
      throw error;
    }
  }
}

export default ActivityRepository;
EOL

# Activity Service
echo "Creating activity service..."
cat <<EOL > $SERVICE_DIR/activity.ts
import { Request, Response } from "express";
import ActivityRepository from "../repositories/activity";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";

class ActivityService {
  private activityRepository = new ActivityRepository();

  public async getActivities(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activities = await this.activityRepository.getActivities(req, pagination, search);
      res.sendFormatted(activities, "Activities retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-getActivities");
      res.sendError("Failed to retrieve activities", 500);
    }
  }

  public async getActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activity = await this.activityRepository.getActivity(req, id);
      res.sendFormatted(activity, "Activity retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-getActivity");
      res.sendError("Failed to retrieve activity", 500);
    }
  }

  public async createActivity(req: Request, res: Response) {
    try {
      const activityData = req.body;
      const newActivity = await this.activityRepository.createActivity(req, activityData);
      res.sendFormatted(newActivity, "Activity created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityService-createActivity");
      res.sendError("Activity creation failed", 500);
    }
  }

  public async updateActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityData = req.body;
      const updatedActivity = await this.activityRepository.updateActivity(req, id, activityData);
      res.sendFormatted(updatedActivity, "Activity updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-updateActivity");
      res.sendError("Activity update failed", 500);
    }
  }

  public async deleteActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivity = await this.activityRepository.deleteActivity(req, id);
      res.sendFormatted(deletedActivity, "Activity deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-deleteActivity");
      res.sendError("Activity deletion failed", 500);
    }
  }
}

export default ActivityService;
EOL

# Activity Middleware
echo "Creating activity middleware..."
cat <<EOL > $MIDDLEWARE_DIR/activity.ts
import { Request, Response, NextFunction } from "express";
import { ActivityModel } from "../models/activity";

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
EOL

# Activity Routes
echo "Creating activity routes..."
cat <<EOL > $ROUTE_DIR/activity.ts
import { Router } from "express";
import ActivityService from "../services/activity";
import ActivityMiddleware from "../middlewares/activity";

const router = Router();
const activityService = new ActivityService();
const activityMiddleware = new ActivityMiddleware();

// GET all activities
router.get("/", activityService.getActivities.bind(activityService));

// GET activity by ID
router.get(
  "/:id",
  activityMiddleware.validateGet.bind(activityMiddleware),
  activityService.getActivity.bind(activityService)
);

// CREATE a new activity
router.post(
  "/",
  activityMiddleware.validateCreate.bind(activityMiddleware),
  activityService.createActivity.bind(activityService)
);

// UPDATE an activity
router.patch(
  "/:id",
  activityMiddleware.validateUpdate.bind(activityMiddleware),
  activityService.updateActivity.bind(activityService)
);

// DELETE an activity
router.delete(
  "/:id",
  activityMiddleware.validateDelete.bind(activityMiddleware),
  activityService.deleteActivity.bind(activityService)
);

export default router;
EOL

# Log Success Message
echo "Activity module files created successfully!"

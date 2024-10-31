#!/bin/bash

# create-activity.sh - A script to generate the Activity module with boilerplate code

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display informational messages
function echo_info {
  echo -e "\e[34m[CREATE]\e[0m $1"
}

# Function to display error messages
function echo_error {
  echo -e "\e[31m[ERROR]\e[0m $1"
}

# 1. Create Model
echo_info "Creating Model for Activity..."

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
  updatedByModel: string; // Field to support refPath
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
    updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: "updatedByModel", required: true },
    updatedByModel: { type: String, required: true, enum: ["Worker", "Manager"] }, // Define possible models
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

# 2. Create Interface
echo_info "Creating Interface for Activity..."

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
  project: IProject;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: IWorker[];
  updatedBy: IWorker | IManager;
  hoursSpent: number;
  statusHistory: IActivityStatus[];
  status: IActivityStatus;
  workCompleteStatus: boolean;
  managerFullStatus: boolean;
  customerStatus: boolean;
  isSubmitted: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string;
  customer: ICustomer;
  isPending: boolean;
  isOnHold: boolean;
  isDisabled: boolean;
  isDeleted: boolean;
}

export interface ICreateActivity {
  title: string;
  description: string;
  project: string; // Project ID
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: string[]; // Worker IDs
  updatedBy: string; // Worker or Manager ID
  updatedByModel: "Worker" | "Manager";
  hoursSpent: number;
  status: string; // ActivityStatus ID
  customer: string; // Customer ID
  // Add any additional fields if necessary
}

export interface IUpdateActivity {
  title?: string;
  description?: string;
  project?: string; // Project ID
  budget?: number;
  forecastDate?: Date;
  actualDate?: Date;
  targetDate?: Date;
  workers?: string[]; // Worker IDs
  updatedBy?: string; // Worker or Manager ID
  updatedByModel?: "Worker" | "Manager";
  hoursSpent?: number;
  status?: string; // ActivityStatus ID
  workCompleteStatus?: boolean;
  managerFullStatus?: boolean;
  customerStatus?: boolean;
  isSubmitted?: boolean;
  isAccepted?: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
  customer?: string; // Customer ID
  isPending?: boolean;
  isOnHold?: boolean;
  isDisabled?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}
EOT

# 3. Create Repository
echo_info "Creating Repository for Activity..."

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
        query.title = { \$regex: search, \$options: "i" };
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
        .lean<IActivity[]>();

      const totalCount = await ActivityModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: activities,
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
        .lean<IActivity>();
      if (!activity || activity.isDeleted) {
        throw new Error("Activity not found");
      }
      return activity;
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
      return newActivity.toObject() as IActivity;
    } catch (error) {
      await logError(error, req, "ActivityRepository-createActivity");
      throw error;
    }
  }

  public async updateActivity(
    req: Request,
    id: string,
    activityData: IUpdateActivity
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
        .populate("customer")
        .lean<IActivity>();
      if (!updatedActivity || updatedActivity.isDeleted) {
        throw new Error("Failed to update activity");
      }
      return updatedActivity;
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivity");
      throw error;
    }
  }

  public async deleteActivity(req: Request, id: string): Promise<IActivity> {
    try {
      const deletedActivity = await ActivityModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("project")
        .populate("workers")
        .populate("updatedBy")
        .populate("status")
        .populate("statusHistory")
        .populate("customer")
        .lean<IActivity>();
      if (!deletedActivity) {
        throw new Error("Failed to delete activity");
      }
      return deletedActivity;
    } catch (error) {
      await logError(error, req, "ActivityRepository-deleteActivity");
      throw error;
    }
  }
}

export default ActivityRepository;
EOT

# 4. Create Service
echo_info "Creating Service for Activity..."

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
      const activities = await this.activityRepository.getActivities(req, pagination, search);
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
      const updatedActivity = await this.activityRepository.updateActivity(req, id, activityData);
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

# 5. Create Middleware
echo_info "Creating Middleware for Activity..."

cat <<EOT > src/middlewares/activity.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, budget, project, workers, updatedBy, updatedByModel, status, customer } = req.body;
      if (!title || !description || !budget || !project || !updatedBy || !updatedByModel || !status || !customer) {
        res.sendError(
          "ValidationError: Title, Description, Budget, Project, UpdatedBy, UpdatedByModel, Status, and Customer are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      // Add more validation as needed (e.g., check data types, references existence)
      next();
    } catch (error) {
      await logError(error, req, "ActivityMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, budget, project, workers, updatedBy, updatedByModel, status, customer, isActive, isDeleted } = req.body;
      if (!title && !description && !budget && !project && !workers && !updatedBy && !updatedByModel && !status && !customer && isActive === undefined && isDeleted === undefined) {
        res.sendError(
          "ValidationError: At least one field must be provided for update",
          "At least one field must be provided for update",
          400
        );
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "ActivityMiddleware-validateUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "ActivityMiddleware-validateDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "ActivityMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityMiddleware;
EOT

# 6. Create Routes
echo_info "Creating Routes for Activity..."

cat <<EOT > src/routes/activityRoute.ts
import { Router } from "express";
import ActivityService from "../services/activity";
import ActivityMiddleware from "../middlewares/activity";

const router = Router();
const activityService = new ActivityService();
const activityMiddleware = new ActivityMiddleware();

// GET all activities
router.get(
  "/",
  activityService.getActivities.bind(activityService)
);

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
EOT

# 7. Register Routes in Main Routes File
echo_info "Registering Activity routes in the main routes file..."

MAIN_ROUTE_FILE="src/routes/index.ts"

if [ ! -f "$MAIN_ROUTE_FILE" ]; then
  echo_info "Creating main routes file..."
  mkdir -p src/routes
  cat <<EOT > "$MAIN_ROUTE_FILE"
import { Router } from "express";
import projectRoute from "./projectRoute";
import managerRoute from "./managerRoute";
import activityRoute from "./activityRoute";
import activityStatusRoute from "./activityStatusRoute";
// Import other routes here

const router = Router();

// Register Project routes
router.use("/projects", projectRoute);

// Register Manager routes
router.use("/managers", managerRoute);

// Register Activity routes
router.use("/activities", activityRoute);

// Register ActivityStatus routes
router.use("/activityStatuses", activityStatusRoute);

// Register other routes here

export default router;
EOT

  # Update src/index.ts to use the main routes
  echo_info "Updating src/index.ts to use the main routes..."

  cat <<EOT >> src/index.ts

// Import routes
import routes from "./routes";

// Use routes
app.use("/api", routes);
EOT

else
  echo_info "Main routes file already exists. Adding Activity routes if not already present."

  # Detect OS
  OS_TYPE=$(uname)
  if [ "$OS_TYPE" == "Darwin" ]; then
    # macOS
    echo_info "Detected macOS. Using BSD sed."
    # Check if Activity routes are already registered
    if grep -q 'router.use("/activities", activityRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "Activity routes are already registered in the main routes file."
    else
      # Add Activity routes using sed
      echo_info "Adding Activity routes to the main routes file..."
      sed -i '' '/\/\/ Register other routes here/a\
      \
      // Register Activity routes\
      router.use("/activities", activityRoute);\
      ' "$MAIN_ROUTE_FILE"
    fi
  elif [ "$OS_TYPE" == "Linux" ]; then
    # Linux
    echo_info "Detected Linux. Using GNU sed."
    # Check if Activity routes are already registered
    if grep -q 'router.use("/activities", activityRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "Activity routes are already registered in the main routes file."
    else
      # Add Activity routes using sed
      echo_info "Adding Activity routes to the main routes file..."
      sed -i '/\/\/ Register other routes here/a \
      \
      // Register Activity routes\
      router.use("/activities", activityRoute);' "$MAIN_ROUTE_FILE"
    fi
  else
    echo_info "Unsupported OS. Using awk to append Activity routes."
    # Using awk to append Activity routes
    if grep -q 'router.use("/activities", activityRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "Activity routes are already registered in the main routes file."
    else
      echo_info "Adding Activity routes to the main routes file using awk..."
      awk '/\/\/ Register other routes here/ {print; print "// Register Activity routes"; print "router.use(\"/activities\", activityRoute);"; next}1' "$MAIN_ROUTE_FILE" > tmp && mv tmp "$MAIN_ROUTE_FILE"
    fi
  fi
fi

# 8. Final Message
echo_info "Activity module generated successfully."
echo_info "You can now start using the Activity routes at '/api/activities'."

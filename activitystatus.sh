#!/bin/bash

# create-activityStatus.sh - A script to generate the ActivityStatus module with boilerplate code

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
echo_info "Creating Model for ActivityStatus..."

cat <<EOT > src/database/models/activityStatus.ts
import mongoose from "mongoose";

interface IActivityStatus extends mongoose.Document {
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
}

const ActivityStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ActivityStatusModel = mongoose.model<IActivityStatus>("ActivityStatus", ActivityStatusSchema);
EOT

# 2. Create Interface
echo_info "Creating Interface for ActivityStatus..."

cat <<EOT > src/interfaces/activityStatus.ts
export interface IActivityStatus {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  // Add any additional fields if necessary
}

export interface ICreateActivityStatus {
  name: string;
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

export interface IUpdateActivityStatus {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}
EOT

# 3. Create Repository
echo_info "Creating Repository for ActivityStatus..."

cat <<EOT > src/database/repositories/activityStatus.ts
import { Request } from "express";
import { ActivityStatusModel } from "../models/activityStatus";
import { IActivityStatus, ICreateActivityStatus, IUpdateActivityStatus } from "../../interfaces/activityStatus";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ActivityStatusRepository {
  public async getActivityStatuses(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IActivityStatus[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { \$regex: search, \$options: "i" };
      }
      const activityStatuses = await ActivityStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IActivityStatus[]>();

      const totalCount = await ActivityStatusModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: activityStatuses,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-getActivityStatuses");
      throw error;
    }
  }

  public async getActivityStatusById(req: Request, id: string): Promise<IActivityStatus> {
    try {
      const activityStatus = await ActivityStatusModel.findById(id).lean<IActivityStatus>();
      if (!activityStatus || activityStatus.isDeleted) {
        throw new Error("ActivityStatus not found");
      }
      return activityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-getActivityStatusById");
      throw error;
    }
  }

  public async createActivityStatus(
    req: Request,
    activityStatusData: ICreateActivityStatus
  ): Promise<IActivityStatus> {
    try {
      const newActivityStatus = await ActivityStatusModel.create(activityStatusData);
      return newActivityStatus.toObject() as IActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-createActivityStatus");
      throw error;
    }
  }

  public async updateActivityStatus(
    req: Request,
    id: string,
    activityStatusData: IUpdateActivityStatus
  ): Promise<IActivityStatus> {
    try {
      const updatedActivityStatus = await ActivityStatusModel.findByIdAndUpdate(id, activityStatusData, {
        new: true,
      }).lean<IActivityStatus>();
      if (!updatedActivityStatus || updatedActivityStatus.isDeleted) {
        throw new Error("Failed to update ActivityStatus");
      }
      return updatedActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-updateActivityStatus");
      throw error;
    }
  }

  public async deleteActivityStatus(req: Request, id: string): Promise<IActivityStatus> {
    try {
      const deletedActivityStatus = await ActivityStatusModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).lean<IActivityStatus>();
      if (!deletedActivityStatus) {
        throw new Error("Failed to delete ActivityStatus");
      }
      return deletedActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-deleteActivityStatus");
      throw error;
    }
  }
}

export default ActivityStatusRepository;
EOT

# 4. Create Service
echo_info "Creating Service for ActivityStatus..."

cat <<EOT > src/services/activityStatus.ts
import { Request, Response } from "express";
import ActivityStatusRepository from "../database/repositories/activityStatus";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ActivityStatusService {
  private activityStatusRepository: ActivityStatusRepository;

  constructor() {
    this.activityStatusRepository = new ActivityStatusRepository();
  }

  public async getActivityStatuses(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityStatuses = await this.activityStatusRepository.getActivityStatuses(req, pagination, search);
      res.sendArrayFormatted(activityStatuses, "ActivityStatuses retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-getActivityStatuses");
      res.sendError(error, "ActivityStatuses retrieval failed");
    }
  }

  public async getActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityStatus = await this.activityStatusRepository.getActivityStatusById(req, id);
      res.sendFormatted(activityStatus, "ActivityStatus retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-getActivityStatus");
      res.sendError(error, "ActivityStatus retrieval failed");
    }
  }

  public async createActivityStatus(req: Request, res: Response) {
    try {
      const activityStatusData = req.body;
      const newActivityStatus = await this.activityStatusRepository.createActivityStatus(req, activityStatusData);
      res.sendFormatted(newActivityStatus, "ActivityStatus created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityStatusService-createActivityStatus");
      res.sendError(error, "ActivityStatus creation failed");
    }
  }

  public async updateActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityStatusData = req.body;
      const updatedActivityStatus = await this.activityStatusRepository.updateActivityStatus(req, id, activityStatusData);
      res.sendFormatted(updatedActivityStatus, "ActivityStatus updated successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-updateActivityStatus");
      res.sendError(error, "ActivityStatus update failed");
    }
  }

  public async deleteActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivityStatus = await this.activityStatusRepository.deleteActivityStatus(req, id);
      res.sendFormatted(deletedActivityStatus, "ActivityStatus deleted successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-deleteActivityStatus");
      res.sendError(error, "ActivityStatus deletion failed");
    }
  }
}

export default ActivityStatusService;
EOT

# 5. Create Middleware
echo_info "Creating Middleware for ActivityStatus..."

cat <<EOT > src/middlewares/activityStatus.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityStatusMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name is required",
          "Name must be provided",
          400
        );
        return;
      }
      // Add more validation as needed (e.g., unique name check)
      next();
    } catch (error) {
      await logError(error, req, "ActivityStatusMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, isActive, isDeleted } = req.body;
      if (!name && isActive === undefined && isDeleted === undefined) {
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
      await logError(error, req, "ActivityStatusMiddleware-validateUpdate");
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
      await logError(error, req, "ActivityStatusMiddleware-validateDelete");
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
      await logError(error, req, "ActivityStatusMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityStatusMiddleware;
EOT

# 6. Create Routes
echo_info "Creating Routes for ActivityStatus..."

cat <<EOT > src/routes/activityStatusRoute.ts
import { Router } from "express";
import ActivityStatusService from "../services/activityStatus";
import ActivityStatusMiddleware from "../middlewares/activityStatus";

const router = Router();
const activityStatusService = new ActivityStatusService();
const activityStatusMiddleware = new ActivityStatusMiddleware();

// GET all activity statuses
router.get(
  "/",
  activityStatusService.getActivityStatuses.bind(activityStatusService)
);

// GET activity status by ID
router.get(
  "/:id",
  activityStatusMiddleware.validateGet.bind(activityStatusMiddleware),
  activityStatusService.getActivityStatus.bind(activityStatusService)
);

// CREATE a new activity status
router.post(
  "/",
  activityStatusMiddleware.validateCreate.bind(activityStatusMiddleware),
  activityStatusService.createActivityStatus.bind(activityStatusService)
);

// UPDATE an activity status
router.patch(
  "/:id",
  activityStatusMiddleware.validateUpdate.bind(activityStatusMiddleware),
  activityStatusService.updateActivityStatus.bind(activityStatusService)
);

// DELETE an activity status
router.delete(
  "/:id",
  activityStatusMiddleware.validateDelete.bind(activityStatusMiddleware),
  activityStatusService.deleteActivityStatus.bind(activityStatusService)
);

export default router;
EOT

# 7. Register Routes in Main Routes File
echo_info "Registering ActivityStatus routes in the main routes file..."

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
  echo_info "Main routes file already exists. Adding ActivityStatus routes if not already present."

  # Detect OS
  OS_TYPE=$(uname)
  if [ "$OS_TYPE" == "Darwin" ]; then
    # macOS
    echo_info "Detected macOS. Using BSD sed."
    # Check if ActivityStatus routes are already registered
    if grep -q 'router.use("/activityStatuses", activityStatusRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "ActivityStatus routes are already registered in the main routes file."
    else
      # Add ActivityStatus routes using sed
      echo_info "Adding ActivityStatus routes to the main routes file..."
      sed -i '' '/\/\/ Register other routes here/a\
      \
      // Register ActivityStatus routes\
      router.use("/activityStatuses", activityStatusRoute);\
      ' "$MAIN_ROUTE_FILE"
    fi
  elif [ "$OS_TYPE" == "Linux" ]; then
    # Linux
    echo_info "Detected Linux. Using GNU sed."
    # Check if ActivityStatus routes are already registered
    if grep -q 'router.use("/activityStatuses", activityStatusRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "ActivityStatus routes are already registered in the main routes file."
    else
      # Add ActivityStatus routes using sed
      echo_info "Adding ActivityStatus routes to the main routes file..."
      sed -i '/\/\/ Register other routes here/a \
      \
      // Register ActivityStatus routes\
      router.use("/activityStatuses", activityStatusRoute);' "$MAIN_ROUTE_FILE"
    fi
  else
    echo_info "Unsupported OS. Using awk to append ActivityStatus routes."
    # Using awk to append ActivityStatus routes
    if grep -q 'router.use("/activityStatuses", activityStatusRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "ActivityStatus routes are already registered in the main routes file."
    else
      echo_info "Adding ActivityStatus routes to the main routes file using awk..."
      awk '/\/\/ Register other routes here/ {print; print "// Register ActivityStatus routes"; print "router.use(\"/activityStatuses\", activityStatusRoute);"; next}1' "$MAIN_ROUTE_FILE" > tmp && mv tmp "$MAIN_ROUTE_FILE"
    fi
  fi
fi

# 8. Final Message
echo_info "ActivityStatus module generated successfully."
echo_info "You can now start using the ActivityStatus routes at '/api/activityStatuses'."

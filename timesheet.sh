#!/bin/bash

# create-timesheet.sh - A script to generate the Timesheet module with boilerplate code

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
echo_info "Creating Model for Timesheet..."

cat <<EOT > src/database/models/timesheet.ts
import mongoose from "mongoose";
import { ActivityModel } from "./activity";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";

interface ITimesheet extends mongoose.Document {
  activity: mongoose.Schema.Types.ObjectId | typeof ActivityModel;
  worker: mongoose.Schema.Types.ObjectId | typeof WorkerModel;
  manager: mongoose.Schema.Types.ObjectId | typeof ManagerModel;
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  isPending: boolean;
  isRejected: boolean;
  isAccepted: boolean;
  isResubmitted: boolean;
  rejectionReason: string[];
  isDeleted: boolean;
  isActive: boolean;
}

const TimesheetSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    hoursSpent: { type: Number, required: true },
    date: { type: Date, required: true },
    file: { type: String, required: true },
    isPending: { type: Boolean, default: true },
    isRejected: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isResubmitted: { type: Boolean, default: false },
    rejectionReason: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TimesheetModel = mongoose.model<ITimesheet>("Timesheet", TimesheetSchema);
EOT

# 2. Create Interface
echo_info "Creating Interface for Timesheet..."

cat <<EOT > src/interfaces/timesheet.ts
import { IActivity } from "./activity";
import { IWorker } from "./worker";
import { IManager } from "./manager";

export interface ITimesheet {
  _id: string;
  activity: IActivity;
  worker: IWorker;
  manager: IManager;
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  isPending: boolean;
  isRejected: boolean;
  isAccepted: boolean;
  isResubmitted: boolean;
  rejectionReason: string[];
  isDeleted: boolean;
  isActive: boolean;
}

export interface ICreateTimesheet {
  activity: string; // Activity ID
  worker: string;   // Worker ID
  manager: string;  // Manager ID
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  // Add any additional fields if necessary
}

export interface IUpdateTimesheet {
  activity?: string; // Activity ID
  worker?: string;   // Worker ID
  manager?: string;  // Manager ID
  startTime?: Date;
  endTime?: Date;
  hoursSpent?: number;
  date?: Date;
  file?: string;
  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  isResubmitted?: boolean;
  rejectionReason?: string[];
  isDeleted?: boolean;
  isActive?: boolean;
  // Add any additional fields if necessary
}
EOT

# 3. Create Repository
echo_info "Creating Repository for Timesheet..."

cat <<EOT > src/database/repositories/timesheet.ts
import { Request } from "express";
import { TimesheetModel } from "../models/timesheet";
import { ITimesheet, ICreateTimesheet, IUpdateTimesheet } from "../../interfaces/timesheet";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class TimesheetRepository {
  public async getTimesheets(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ITimesheet[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.file = { \$regex: search, \$options: "i" };
      }
      const timesheets = await TimesheetModel.find(query)
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<ITimesheet[]>();

      const totalCount = await TimesheetModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: timesheets,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "TimesheetRepository-getTimesheets");
      throw error;
    }
  }

  public async getTimesheetById(req: Request, id: string): Promise<ITimesheet> {
    try {
      const timesheet = await TimesheetModel.findById(id)
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .lean<ITimesheet>();
      if (!timesheet || timesheet.isDeleted) {
        throw new Error("Timesheet not found");
      }
      return timesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-getTimesheetById");
      throw error;
    }
  }

  public async createTimesheet(
    req: Request,
    timesheetData: ICreateTimesheet
  ): Promise<ITimesheet> {
    try {
      const newTimesheet = await TimesheetModel.create(timesheetData);
      return newTimesheet.toObject() as ITimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-createTimesheet");
      throw error;
    }
  }

  public async updateTimesheet(
    req: Request,
    id: string,
    timesheetData: IUpdateTimesheet
  ): Promise<ITimesheet> {
    try {
      const updatedTimesheet = await TimesheetModel.findByIdAndUpdate(id, timesheetData, {
        new: true,
      })
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .lean<ITimesheet>();
      if (!updatedTimesheet || updatedTimesheet.isDeleted) {
        throw new Error("Failed to update timesheet");
      }
      return updatedTimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-updateTimesheet");
      throw error;
    }
  }

  public async deleteTimesheet(req: Request, id: string): Promise<ITimesheet> {
    try {
      const deletedTimesheet = await TimesheetModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .lean<ITimesheet>();
      if (!deletedTimesheet) {
        throw new Error("Failed to delete timesheet");
      }
      return deletedTimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-deleteTimesheet");
      throw error;
    }
  }
}

export default TimesheetRepository;
EOT

# 4. Create Service
echo_info "Creating Service for Timesheet..."

cat <<EOT > src/services/timesheet.ts
import { Request, Response } from "express";
import TimesheetRepository from "../database/repositories/timesheet";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class TimesheetService {
  private timesheetRepository: TimesheetRepository;

  constructor() {
    this.timesheetRepository = new TimesheetRepository();
  }

  public async getTimesheets(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const timesheets = await this.timesheetRepository.getTimesheets(req, pagination, search);
      res.sendArrayFormatted(timesheets, "Timesheets retrieved successfully");
    } catch (error) {
      await logError(error, req, "TimesheetService-getTimesheets");
      res.sendError(error, "Timesheets retrieval failed");
    }
  }

  public async getTimesheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timesheet = await this.timesheetRepository.getTimesheetById(req, id);
      res.sendFormatted(timesheet, "Timesheet retrieved successfully");
    } catch (error) {
      await logError(error, req, "TimesheetService-getTimesheet");
      res.sendError(error, "Timesheet retrieval failed");
    }
  }

  public async createTimesheet(req: Request, res: Response) {
    try {
      const timesheetData = req.body;
      const newTimesheet = await this.timesheetRepository.createTimesheet(req, timesheetData);
      res.sendFormatted(newTimesheet, "Timesheet created successfully", 201);
    } catch (error) {
      await logError(error, req, "TimesheetService-createTimesheet");
      res.sendError(error, "Timesheet creation failed");
    }
  }

  public async updateTimesheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timesheetData = req.body;
      const updatedTimesheet = await this.timesheetRepository.updateTimesheet(req, id, timesheetData);
      res.sendFormatted(updatedTimesheet, "Timesheet updated successfully");
    } catch (error) {
      await logError(error, req, "TimesheetService-updateTimesheet");
      res.sendError(error, "Timesheet update failed");
    }
  }

  public async deleteTimesheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedTimesheet = await this.timesheetRepository.deleteTimesheet(req, id);
      res.sendFormatted(deletedTimesheet, "Timesheet deleted successfully");
    } catch (error) {
      await logError(error, req, "TimesheetService-deleteTimesheet");
      res.sendError(error, "Timesheet deletion failed");
    }
  }
}

export default TimesheetService;
EOT

# 5. Create Middleware
echo_info "Creating Middleware for Timesheet..."

cat <<EOT > src/middlewares/timesheet.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class TimesheetMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { activity, worker, manager, startTime, endTime, hoursSpent, date, file } = req.body;
      if (!activity || !worker || !manager || !startTime || !endTime || !hoursSpent || !date || !file) {
        res.sendError(
          "ValidationError: Activity, Worker, Manager, StartTime, EndTime, HoursSpent, Date, and File are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      // Additional validation can be added here (e.g., check if IDs exist)
      next();
    } catch (error) {
      await logError(error, req, "TimesheetMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { activity, worker, manager, startTime, endTime, hoursSpent, date, file, isPending, isRejected, isAccepted, isResubmitted, rejectionReason, isDeleted, isActive } = req.body;
      if (!activity && !worker && !manager && !startTime && !endTime && !hoursSpent && !date && !file && isPending === undefined && isRejected === undefined && isAccepted === undefined && isResubmitted === undefined && !rejectionReason && isDeleted === undefined && isActive === undefined) {
        res.sendError(
          "ValidationError: At least one field must be provided for update",
          "At least one field must be provided for update",
          400
        );
        return;
      }
      // Additional validation can be added here
      next();
    } catch (error) {
      await logError(error, req, "TimesheetMiddleware-validateUpdate");
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
      await logError(error, req, "TimesheetMiddleware-validateDelete");
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
      await logError(error, req, "TimesheetMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default TimesheetMiddleware;
EOT

# 6. Create Routes
echo_info "Creating Routes for Timesheet..."

cat <<EOT > src/routes/timesheetRoute.ts
import { Router } from "express";
import TimesheetService from "../services/timesheet";
import TimesheetMiddleware from "../middlewares/timesheet";

const router = Router();
const timesheetService = new TimesheetService();
const timesheetMiddleware = new TimesheetMiddleware();

// GET all timesheets
router.get(
  "/",
  timesheetService.getTimesheets.bind(timesheetService)
);

// GET timesheet by ID
router.get(
  "/:id",
  timesheetMiddleware.validateGet.bind(timesheetMiddleware),
  timesheetService.getTimesheet.bind(timesheetService)
);

// CREATE a new timesheet
router.post(
  "/",
  timesheetMiddleware.validateCreate.bind(timesheetMiddleware),
  timesheetService.createTimesheet.bind(timesheetService)
);

// UPDATE a timesheet
router.patch(
  "/:id",
  timesheetMiddleware.validateUpdate.bind(timesheetMiddleware),
  timesheetService.updateTimesheet.bind(timesheetService)
);

// DELETE a timesheet
router.delete(
  "/:id",
  timesheetMiddleware.validateDelete.bind(timesheetMiddleware),
  timesheetService.deleteTimesheet.bind(timesheetService)
);

export default router;
EOT

# 7. Register Routes in Main Routes File
echo_info "Registering Timesheet routes in the main routes file..."

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
import timesheetRoute from "./timesheetRoute";
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

// Register Timesheet routes
router.use("/timesheets", timesheetRoute);

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
  echo_info "Main routes file already exists. Adding Timesheet routes if not already present."

  # Detect OS
  OS_TYPE=$(uname)
  if [ "$OS_TYPE" == "Darwin" ]; then
    # macOS
    echo_info "Detected macOS. Using BSD sed."
    # Check if Timesheet routes are already registered
    if grep -q 'router.use("/timesheets", timesheetRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "Timesheet routes are already registered in the main routes file."
    else
      # Add Timesheet routes using sed
      echo_info "Adding Timesheet routes to the main routes file..."
      sed -i '' '/\/\/ Register other routes here/a\
      \
      // Register Timesheet routes\
      router.use("/timesheets", timesheetRoute);\
      ' "$MAIN_ROUTE_FILE"
    fi
  elif [ "$OS_TYPE" == "Linux" ]; then
    # Linux
    echo_info "Detected Linux. Using GNU sed."
    # Check if Timesheet routes are already registered
    if grep -q 'router.use("/timesheets", timesheetRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "Timesheet routes are already registered in the main routes file."
    else
      # Add Timesheet routes using sed
      echo_info "Adding Timesheet routes to the main routes file..."
      sed -i '/\/\/ Register other routes here/a \
      \
      // Register Timesheet routes\
      router.use("/timesheets", timesheetRoute);' "$MAIN_ROUTE_FILE"
    fi
  else
    echo_info "Unsupported OS. Using awk to append Timesheet routes."
    # Using awk to append Timesheet routes
    if grep -q 'router.use("/timesheets", timesheetRoute);' "$MAIN_ROUTE_FILE"; then
      echo_info "Timesheet routes are already registered in the main routes file."
    else
      echo_info "Adding Timesheet routes to the main routes file using awk..."
      awk '/\/\/ Register other routes here/ {print; print "// Register Timesheet routes"; print "router.use(\"/timesheets\", timesheetRoute);"; next}1' "$MAIN_ROUTE_FILE" > tmp && mv tmp "$MAIN_ROUTE_FILE"
    fi
  fi
fi

# 8. Final Message
echo_info "Timesheet module generated successfully."
echo_info "You can now start using the Timesheet routes at '/api/timesheets'."

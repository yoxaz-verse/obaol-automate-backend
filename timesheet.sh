#!/bin/bash

# Create model
cat <<EOT > src/database/models/timesheet.ts
import mongoose from "mongoose";
import { ActivityModel } from "./activity";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { StatusHistoryModel } from "./statusHistory";

interface ITimesheet extends mongoose.Document {
  activity: mongoose.Schema.Types.ObjectId;
  worker: mongoose.Schema.Types.ObjectId;
  manager: mongoose.Schema.Types.ObjectId;
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
  statusHistory: mongoose.Schema.Types.ObjectId[];
}

const TimesheetSchema = new mongoose.Schema(
  {
    activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity", required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    hoursSpent: { type: Number, required: true },
    date: { type: Date, required: true },
    file: { type: String, required: true },
    isPending: { type: Boolean, default: true },
    isRejected: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isResubmitted: { type: Boolean, default: false },
    rejectionReason: { type: [String] },
    statusHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "StatusHistory", required: true }]
  },
  { timestamps: true }
);

export const TimesheetModel = mongoose.model<ITimesheet>("Timesheet", TimesheetSchema);
EOT

# Create repository
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
        query.file = { $regex: search, $options: "i" };
      }
      const timesheets = await TimesheetModel.find(query)
        .populate("activity worker manager statusHistory")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

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
        .populate("activity worker manager statusHistory")
        .lean();
      if (!timesheet) {
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
      return newTimesheet.toObject();
    } catch (error) {
      await logError(error, req, "TimesheetRepository-createTimesheet");
      throw error;
    }
  }

  public async updateTimesheet(
    req: Request,
    id: string,
    timesheetData: Partial<IUpdateTimesheet>
  ): Promise<ITimesheet> {
    try {
      const updatedTimesheet = await TimesheetModel.findByIdAndUpdate(id, timesheetData, {
        new: true,
      }).populate("activity worker manager statusHistory");
      if (!updatedTimesheet) {
        throw new Error("Failed to update timesheet");
      }
      return updatedTimesheet.toObject();
    } catch (error) {
      await logError(error, req, "TimesheetRepository-updateTimesheet");
      throw error;
    }
  }

  public async deleteTimesheet(req: Request, id: string): Promise<ITimesheet> {
    try {
      const deletedTimesheet = await TimesheetModel.findByIdAndDelete(id).populate(
        "activity worker manager statusHistory"
      );
      if (!deletedTimesheet) {
        throw new Error("Failed to delete timesheet");
      }
      return deletedTimesheet.toObject();
    } catch (error) {
      await logError(error, req, "TimesheetRepository-deleteTimesheet");
      throw error;
    }
  }
}

export default TimesheetRepository;
EOT

# Create service
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
      const timesheets = await this.timesheetRepository.getTimesheets(
        req,
        pagination,
        search
      );
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
      const updatedTimesheet = await this.timesheetRepository.updateTimesheet(
        req,
        id,
        timesheetData
      );
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

# Create middleware
cat <<EOT > src/middlewares/timesheet.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class TimesheetMiddleware {
  public async createTimesheet(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        activity,
        worker,
        manager,
        startTime,
        endTime,
        hoursSpent,
        date,
        file,
      } = req.body;
      if (!activity || !worker || !manager || !startTime || !endTime || !hoursSpent || !date || !file) {
        res.sendError(
          "ValidationError: Activity, Worker, Manager, StartTime, EndTime, HoursSpent, Date, and File must be provided",
          "Activity, Worker, Manager, StartTime, EndTime, HoursSpent, Date, and File must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-TimesheetCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateTimesheet(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        activity,
        worker,
        manager,
        startTime,
        endTime,
        hoursSpent,
        date,
        file,
      } = req.body;
      if (!activity || !worker || !manager || !startTime || !endTime || !hoursSpent || !date || !file) {
        res.sendError(
          "ValidationError: Activity, Worker, Manager, StartTime, EndTime, HoursSpent, Date, and File must be provided",
          "Activity, Worker, Manager, StartTime, EndTime, HoursSpent, Date, and File must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-TimesheetUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteTimesheet(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-TimesheetDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getTimesheet(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-TimesheetGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default TimesheetMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/timesheet.ts
import { IActivity } from "./activity";
import { IWorker } from "./worker";
import { IManager } from "./manager";
import { IStatusHistory } from "./statusHistory";

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
  statusHistory: IStatusHistory[];
}

export interface ICreateTimesheet {
  activity: string;
  worker: string;
  manager: string;
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  isResubmitted?: boolean;
  rejectionReason?: string[];
  statusHistory: string[];
}

export interface IUpdateTimesheet {
  activity?: string;
  worker?: string;
  manager?: string;
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
  statusHistory?: string[];
}
EOT

# Create routes
cat <<EOT > src/routes/timesheetRoute.ts
import { Router } from "express";
import TimesheetService from "../services/timesheet";
import TimesheetMiddleware from "../middlewares/timesheet";

const router = Router();
const timesheetService = new TimesheetService();
const timesheetMiddleware = new TimesheetMiddleware();

router.get(
  "/",
  timesheetMiddleware.getTimesheet.bind(timesheetMiddleware),
  timesheetService.getTimesheets.bind(timesheetService)
);
router.get(
  "/:id",
  timesheetMiddleware.getTimesheet.bind(timesheetMiddleware),
  timesheetService.getTimesheet.bind(timesheetService)
);
router.post(
  "/",
  timesheetMiddleware.createTimesheet.bind(timesheetMiddleware),
  timesheetService.createTimesheet.bind(timesheetService)
);
router.put(
  "/:id",
  timesheetMiddleware.updateTimesheet.bind(timesheetMiddleware),
  timesheetService.updateTimesheet.bind(timesheetService)
);
router.delete(
  "/:id",
  timesheetMiddleware.deleteTimesheet.bind(timesheetMiddleware),
  timesheetService.deleteTimesheet.bind(timesheetService)
);

export default router;
EOT

echo "Timesheet module generated successfully."
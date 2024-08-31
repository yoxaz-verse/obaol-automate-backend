#!/bin/bash

# Create model
cat <<EOT > src/database/models/activityStatus.ts
import mongoose from "mongoose";

interface IActivityStatus extends mongoose.Document {
  name: string;
  priority?: number;
}

const ActivityStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ActivityStatusModel = mongoose.model<IActivityStatus>("ActivityStatus", ActivityStatusSchema);
EOT

# Create repository
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
        query.name = { $regex: search, $options: "i" };
      }
      const activityStatuses = await ActivityStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ActivityStatusModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: activityStatuses as IActivityStatus[],
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
      const activityStatus = await ActivityStatusModel.findById(id).lean();
      if (!activityStatus) {
        throw new Error("Activity Status not found");
      }
      return activityStatus as IActivityStatus;
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
      return newActivityStatus.toObject();
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-createActivityStatus");
      throw error;
    }
  }

  public async updateActivityStatus(
    req: Request,
    id: string,
    activityStatusData: Partial<IUpdateActivityStatus>
  ): Promise<IActivityStatus> {
    try {
      const updatedActivityStatus = await ActivityStatusModel.findByIdAndUpdate(id, activityStatusData, {
        new: true,
      });
      if (!updatedActivityStatus) {
        throw new Error("Failed to update activity status");
      }
      return updatedActivityStatus.toObject();
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-updateActivityStatus");
      throw error;
    }
  }

  public async deleteActivityStatus(req: Request, id: string): Promise<IActivityStatus> {
    try {
      const deletedActivityStatus = await ActivityStatusModel.findByIdAndDelete(id);
      if (!deletedActivityStatus) {
        throw new Error("Failed to delete activity status");
      }
      return deletedActivityStatus.toObject();
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-deleteActivityStatus");
      throw error;
    }
  }
}

export default ActivityStatusRepository;
EOT

# Create service
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
      const activityStatuses = await this.activityStatusRepository.getActivityStatuses(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(activityStatuses, "Activity Statuses retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-getActivityStatuses");
      res.sendError(error, "Activity Statuses retrieval failed");
    }
  }

  public async getActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityStatus = await this.activityStatusRepository.getActivityStatusById(req, id);
      res.sendFormatted(activityStatus, "Activity Status retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-getActivityStatus");
      res.sendError(error, "Activity Status retrieval failed");
    }
  }

  public async createActivityStatus(req: Request, res: Response) {
    try {
      const activityStatusData = req.body;
      const newActivityStatus = await this.activityStatusRepository.createActivityStatus(req, activityStatusData);
      res.sendFormatted(newActivityStatus, "Activity Status created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityStatusService-createActivityStatus");
      res.sendError(error, "Activity Status creation failed");
    }
  }

  public async updateActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityStatusData = req.body;
      const updatedActivityStatus = await this.activityStatusRepository.updateActivityStatus(
        req,
        id,
        activityStatusData
      );
      res.sendFormatted(updatedActivityStatus, "Activity Status updated successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-updateActivityStatus");
      res.sendError(error, "Activity Status update failed");
    }
  }

  public async deleteActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivityStatus = await this.activityStatusRepository.deleteActivityStatus(req, id);
      res.sendFormatted(deletedActivityStatus, "Activity Status deleted successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-deleteActivityStatus");
      res.sendError(error, "Activity Status deletion failed");
    }
  }
}

export default ActivityStatusService;
EOT

# Create middleware
cat <<EOT > src/middlewares/activityStatus.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityStatusMiddleware {
  public async createActivityStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityStatusCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateActivityStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityStatusUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteActivityStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityStatusDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getActivityStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityStatusGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityStatusMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/activityStatus.ts
export interface IActivityStatus {
  _id: string;
  name: string;
  priority?: number;
}

export interface ICreateActivityStatus {
  name: string;
  priority?: number;
}

export interface IUpdateActivityStatus {
  name?: string;
  priority?: number;
}
EOT

# Create routes
cat <<EOT > src/routes/activityStatusRoute.ts
import { Router } from "express";
import ActivityStatusService from "../services/activityStatus";
import ActivityStatusMiddleware from "../middlewares/activityStatus";

const router = Router();
const activityStatusService = new ActivityStatusService();
const activityStatusMiddleware = new ActivityStatusMiddleware();

router.get(
  "/",
  activityStatusService.getActivityStatuses.bind(activityStatusService)
);
router.get(
  "/:id",
  activityStatusMiddleware.getActivityStatus.bind(activityStatusMiddleware),
  activityStatusService.getActivityStatus.bind(activityStatusService)
);
router.post(
  "/",
  activityStatusMiddleware.createActivityStatus.bind(activityStatusMiddleware),
  activityStatusService.createActivityStatus.bind(activityStatusService)
);
router.patch(
  "/:id",
  activityStatusMiddleware.updateActivityStatus.bind(activityStatusMiddleware),
  activityStatusService.updateActivityStatus.bind(activityStatusService)
);
router.delete(
  "/:id",
  activityStatusMiddleware.deleteActivityStatus.bind(activityStatusMiddleware),
  activityStatusService.deleteActivityStatus.bind(activityStatusService)
);

export default router;
EOT

echo "ActivityStatus module generated successfully."

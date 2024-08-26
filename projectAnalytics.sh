#!/bin/bash

# Create model
cat <<EOT > src/database/models/projectAnalytics.ts
import mongoose from "mongoose";
import { ProjectModel } from "./project";

interface IProjectAnalytics extends mongoose.Document {
  project: mongoose.Schema.Types.ObjectId;
  title: string;
  customId: string;
  isActive: boolean;
  isDeleted: boolean;
  startDate: Date;
  endDate: Date;
  forecastDate: Date;
  progress: number;
  hoursSpent: number;
  prevCustomId: string;
  activityCount: string[];
  workerCount: number;
}

const ProjectAnalyticsSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true },
    customId: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    forecastDate: { type: Date, required: true },
    progress: { type: Number, required: true },
    hoursSpent: { type: Number, required: true },
    prevCustomId: { type: String },
    activityCount: { type: [String], required: true },
    workerCount: { type: Number, required: true }
  },
  { timestamps: true }
);

export const ProjectAnalyticsModel = mongoose.model<IProjectAnalytics>("ProjectAnalytics", ProjectAnalyticsSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/projectAnalytics.ts
import { Request } from "express";
import { ProjectAnalyticsModel } from "../models/projectAnalytics";
import { IProjectAnalytics, ICreateProjectAnalytics, IUpdateProjectAnalytics } from "../../interfaces/projectAnalytics";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectAnalyticsRepository {
  public async getProjectAnalytics(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProjectAnalytics[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      const projectAnalytics = await ProjectAnalyticsModel.find(query)
        .populate("project")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ProjectAnalyticsModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: projectAnalytics,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsRepository-getProjectAnalytics");
      throw error;
    }
  }

  public async getProjectAnalyticsById(req: Request, id: string): Promise<IProjectAnalytics> {
    try {
      const projectAnalytics = await ProjectAnalyticsModel.findById(id)
        .populate("project")
        .lean();
      if (!projectAnalytics || projectAnalytics.isDeleted) {
        throw new Error("Project Analytics not found");
      }
      return projectAnalytics;
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsRepository-getProjectAnalyticsById");
      throw error;
    }
  }

  public async createProjectAnalytics(
    req: Request,
    projectAnalyticsData: ICreateProjectAnalytics
  ): Promise<IProjectAnalytics> {
    try {
      const newProjectAnalytics = await ProjectAnalyticsModel.create(projectAnalyticsData);
      return newProjectAnalytics.toObject();
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsRepository-createProjectAnalytics");
      throw error;
    }
  }

  public async updateProjectAnalytics(
    req: Request,
    id: string,
    projectAnalyticsData: Partial<IUpdateProjectAnalytics>
  ): Promise<IProjectAnalytics> {
    try {
      const updatedProjectAnalytics = await ProjectAnalyticsModel.findByIdAndUpdate(id, projectAnalyticsData, {
        new: true,
      }).populate("project");
      if (!updatedProjectAnalytics || updatedProjectAnalytics.isDeleted) {
        throw new Error("Failed to update project analytics");
      }
      return updatedProjectAnalytics.toObject();
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsRepository-updateProjectAnalytics");
      throw error;
    }
  }

  public async deleteProjectAnalytics(req: Request, id: string): Promise<IProjectAnalytics> {
    try {
      const deletedProjectAnalytics = await ProjectAnalyticsModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).populate("project");
      if (!deletedProjectAnalytics) {
        throw new Error("Failed to delete project analytics");
      }
      return deletedProjectAnalytics.toObject();
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsRepository-deleteProjectAnalytics");
      throw error;
    }
  }
}

export default ProjectAnalyticsRepository;
EOT

# Create service
cat <<EOT > src/services/projectAnalytics.ts
import { Request, Response } from "express";
import ProjectAnalyticsRepository from "../database/repositories/projectAnalytics";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectAnalyticsService {
  private projectAnalyticsRepository: ProjectAnalyticsRepository;

  constructor() {
    this.projectAnalyticsRepository = new ProjectAnalyticsRepository();
  }

  public async getProjectAnalytics(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectAnalytics = await this.projectAnalyticsRepository.getProjectAnalytics(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(projectAnalytics, "Project Analytics retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsService-getProjectAnalytics");
      res.sendError(error, "Project Analytics retrieval failed");
    }
  }

  public async getProjectAnalyticsById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectAnalytics = await this.projectAnalyticsRepository.getProjectAnalyticsById(req, id);
      res.sendFormatted(projectAnalytics, "Project Analytics retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsService-getProjectAnalyticsById");
      res.sendError(error, "Project Analytics retrieval failed");
    }
  }

  public async createProjectAnalytics(req: Request, res: Response) {
    try {
      const projectAnalyticsData = req.body;
      const newProjectAnalytics = await this.projectAnalyticsRepository.createProjectAnalytics(req, projectAnalyticsData);
      res.sendFormatted(newProjectAnalytics, "Project Analytics created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsService-createProjectAnalytics");
      res.sendError(error, "Project Analytics creation failed");
    }
  }

  public async updateProjectAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectAnalyticsData = req.body;
      const updatedProjectAnalytics = await this.projectAnalyticsRepository.updateProjectAnalytics(
        req,
        id,
        projectAnalyticsData
      );
      res.sendFormatted(updatedProjectAnalytics, "Project Analytics updated successfully");
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsService-updateProjectAnalytics");
      res.sendError(error, "Project Analytics update failed");
    }
  }

  public async deleteProjectAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProjectAnalytics = await this.projectAnalyticsRepository.deleteProjectAnalytics(req, id);
      res.sendFormatted(deletedProjectAnalytics, "Project Analytics deleted successfully");
    } catch (error) {
      await logError(error, req, "ProjectAnalyticsService-deleteProjectAnalytics");
      res.sendError(error, "Project Analytics deletion failed");
    }
  }
}

export default ProjectAnalyticsService;
EOT

# Create middleware
cat <<EOT > src/middlewares/projectAnalytics.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectAnalyticsMiddleware {
  public async createProjectAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { project, title, customId, startDate, endDate, forecastDate, progress, hoursSpent, activityCount, workerCount } = req.body;
      if (!project || !title || !customId || !startDate || !endDate || !forecastDate || progress === undefined || !hoursSpent || !activityCount || workerCount === undefined) {
        res.sendError(
          "ValidationError: Project, Title, CustomId, StartDate, EndDate, ForecastDate, Progress, HoursSpent, ActivityCount, and WorkerCount must be provided",
          "Project, Title, CustomId, StartDate, EndDate, ForecastDate, Progress, HoursSpent, ActivityCount, and WorkerCount must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectAnalyticsCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateProjectAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { project, title, customId, startDate, endDate, forecastDate, progress, hoursSpent, activityCount, workerCount } = req.body;
      if (!project || !title || !customId || !startDate || !endDate || !forecastDate || progress === undefined || !hoursSpent || !activityCount || workerCount === undefined) {
        res.sendError(
          "ValidationError: Project, Title, CustomId, StartDate, EndDate, ForecastDate, Progress, HoursSpent, ActivityCount, and WorkerCount must be provided",
          "Project, Title, CustomId, StartDate, EndDate, ForecastDate, Progress, HoursSpent, ActivityCount, and WorkerCount must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectAnalyticsUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteProjectAnalytics(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectAnalyticsDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getProjectAnalytics(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectAnalyticsGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectAnalyticsMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/projectAnalytics.ts
import { IProject } from "./project";

export interface IProjectAnalytics {
  _id: string;
  project: IProject;
  title: string;
  customId: string;
  isActive: boolean;
  isDeleted: boolean;
  startDate: Date;
  endDate: Date;
  forecastDate: Date;
  progress: number;
  hoursSpent: number;
  prevCustomId: string;
  activityCount: string[];
  workerCount: number;
}

export interface ICreateProjectAnalytics {
  project: string;
  title: string;
  customId: string;
  isActive?: boolean; 
  isDeleted?: boolean;
  startDate: Date;
  endDate: Date;
  forecastDate: Date;
  progress: number;
  hoursSpent: number;
  prevCustomId?: string;
  activityCount: string[];
  workerCount: number;
}

export interface IUpdateProjectAnalytics {
  project?: string;
  title?: string;
  customId?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  startDate?: Date;
  endDate?: Date;
  forecastDate?: Date;
  progress?: number;
  hoursSpent?: number;
  prevCustomId?: string;
  activityCount?: string[];
  workerCount?: number;
}
EOT

# Create routes
cat <<EOT > src/routes/projectAnalyticsRoute.ts
import { Router } from "express";
import ProjectAnalyticsService from "../services/projectAnalytics";
import ProjectAnalyticsMiddleware from "../middlewares/projectAnalytics";

const router = Router();
const projectAnalyticsService = new ProjectAnalyticsService();
const projectAnalyticsMiddleware = new ProjectAnalyticsMiddleware();

router.get(
  "/",
  projectAnalyticsMiddleware.getProjectAnalytics.bind(projectAnalyticsMiddleware),
  projectAnalyticsService.getProjectAnalytics.bind(projectAnalyticsService)
);
router.get(
  "/:id",
  projectAnalyticsMiddleware.getProjectAnalytics.bind(projectAnalyticsMiddleware),
  projectAnalyticsService.getProjectAnalyticsById.bind(projectAnalyticsService)
);
router.post(
  "/",
  projectAnalyticsMiddleware.createProjectAnalytics.bind(projectAnalyticsMiddleware),
  projectAnalyticsService.createProjectAnalytics.bind(projectAnalyticsService)
);
router.put(
  "/:id",
  projectAnalyticsMiddleware.updateProjectAnalytics.bind(projectAnalyticsMiddleware),
  projectAnalyticsService.updateProjectAnalytics.bind(projectAnalyticsService)
);
router.delete(
  "/:id",
  projectAnalyticsMiddleware.deleteProjectAnalytics.bind(projectAnalyticsMiddleware),
  projectAnalyticsService.deleteProjectAnalytics.bind(projectAnalyticsService)
);

export default router;
EOT

echo "ProjectAnalytics module generated successfully."
#!/bin/bash

# Create model
cat <<EOT > src/database/models/projectStatus.ts
import mongoose from "mongoose";

interface IProjectStatus extends mongoose.Document {
  name: string;
  priority?: number;
}

const ProjectStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProjectStatusModel = mongoose.model<IProjectStatus>("ProjectStatus", ProjectStatusSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/projectStatus.ts
import { Request } from "express";
import { ProjectStatusModel } from "../models/projectStatus";
import { IProjectStatus, ICreateProjectStatus, IUpdateProjectStatus } from "../../interfaces/projectStatus";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectStatusRepository {
  public async getProjectStatuses(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProjectStatus[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const projectStatuses = await ProjectStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ProjectStatusModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: projectStatuses as IProjectStatus[],
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-getProjectStatuses");
      throw error;
    }
  }

  public async getProjectStatusById(req: Request, id: string): Promise<IProjectStatus> {
    try {
      const projectStatus = await ProjectStatusModel.findById(id).lean();
      if (!projectStatus) {
        throw new Error("Project Status not found");
      }
      return projectStatus as IProjectStatus;
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-getProjectStatusById");
      throw error;
    }
  }

  public async createProjectStatus(
    req: Request,
    projectStatusData: ICreateProjectStatus
  ): Promise<IProjectStatus> {
    try {
      const newProjectStatus = await ProjectStatusModel.create(projectStatusData);
      return newProjectStatus.toObject();
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-createProjectStatus");
      throw error;
    }
  }

  public async updateProjectStatus(
    req: Request,
    id: string,
    projectStatusData: Partial<IUpdateProjectStatus>
  ): Promise<IProjectStatus> {
    try {
      const updatedProjectStatus = await ProjectStatusModel.findByIdAndUpdate(id, projectStatusData, {
        new: true,
      });
      if (!updatedProjectStatus) {
        throw new Error("Failed to update project status");
      }
      return updatedProjectStatus.toObject();
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-updateProjectStatus");
      throw error;
    }
  }

  public async deleteProjectStatus(req: Request, id: string): Promise<IProjectStatus> {
    try {
      const deletedProjectStatus = await ProjectStatusModel.findByIdAndDelete(id);
      if (!deletedProjectStatus) {
        throw new Error("Failed to delete project status");
      }
      return deletedProjectStatus.toObject();
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-deleteProjectStatus");
      throw error;
    }
  }
}

export default ProjectStatusRepository;
EOT

# Create service
cat <<EOT > src/services/projectStatus.ts
import { Request, Response } from "express";
import ProjectStatusRepository from "../database/repositories/projectStatus";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectStatusService {
  private projectStatusRepository: ProjectStatusRepository;

  constructor() {
    this.projectStatusRepository = new ProjectStatusRepository();
  }

  public async getProjectStatuses(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectStatuses = await this.projectStatusRepository.getProjectStatuses(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(projectStatuses, "Project Statuses retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-getProjectStatuses");
      res.sendError(error, "Project Statuses retrieval failed");
    }
  }

  public async getProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectStatus = await this.projectStatusRepository.getProjectStatusById(req, id);
      res.sendFormatted(projectStatus, "Project Status retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-getProjectStatus");
      res.sendError(error, "Project Status retrieval failed");
    }
  }

  public async createProjectStatus(req: Request, res: Response) {
    try {
      const projectStatusData = req.body;
      const newProjectStatus = await this.projectStatusRepository.createProjectStatus(req, projectStatusData);
      res.sendFormatted(newProjectStatus, "Project Status created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectStatusService-createProjectStatus");
      res.sendError(error, "Project Status creation failed");
    }
  }

  public async updateProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectStatusData = req.body;
      const updatedProjectStatus = await this.projectStatusRepository.updateProjectStatus(
        req,
        id,
        projectStatusData
      );
      res.sendFormatted(updatedProjectStatus, "Project Status updated successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-updateProjectStatus");
      res.sendError(error, "Project Status update failed");
    }
  }

  public async deleteProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProjectStatus = await this.projectStatusRepository.deleteProjectStatus(req, id);
      res.sendFormatted(deletedProjectStatus, "Project Status deleted successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-deleteProjectStatus");
      res.sendError(error, "Project Status deletion failed");
    }
  }
}

export default ProjectStatusService;
EOT

# Create middleware
cat <<EOT > src/middlewares/projectStatus.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectStatusMiddleware {
  public async createProjectStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectStatusCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateProjectStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectStatusUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteProjectStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectStatusDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getProjectStatus(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectStatusGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectStatusMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/projectStatus.ts
export interface IProjectStatus {
  _id: string;
  name: string;
  priority?: number;
}

export interface ICreateProjectStatus {
  name: string;
  priority?: number;
}

export interface IUpdateProjectStatus {
  name?: string;
  priority?: number;
}
EOT

# Create routes
cat <<EOT > src/routes/projectStatusRoute.ts
import { Router } from "express";
import ProjectStatusService from "../services/projectStatus";
import ProjectStatusMiddleware from "../middlewares/projectStatus";

const router = Router();
const projectStatusService = new ProjectStatusService();
const projectStatusMiddleware = new ProjectStatusMiddleware();

router.get(
  "/",
  projectStatusService.getProjectStatuses.bind(projectStatusService)
);
router.get(
  "/:id",
  projectStatusMiddleware.getProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.getProjectStatus.bind(projectStatusService)
);
router.post(
  "/",
  projectStatusMiddleware.createProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.createProjectStatus.bind(projectStatusService)
);
router.patch(
  "/:id",
  projectStatusMiddleware.updateProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.updateProjectStatus.bind(projectStatusService)
);
router.delete(
  "/:id",
  projectStatusMiddleware.deleteProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.deleteProjectStatus.bind(projectStatusService)
);

export default router;
EOT

echo "ProjectStatus module generated successfully."

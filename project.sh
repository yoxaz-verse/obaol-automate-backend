#!/bin/bash

# Create model
cat <<EOT > src/database/models/project.ts
import mongoose from "mongoose";
import { AdminModel } from "./admin";
import { CustomerModel } from "./customer";
import { ManagerModel } from "./manager";
import { StatusModel } from "./status";
import { LocationModel } from "./location";

interface IProject extends mongoose.Document {
  admin: mongoose.Schema.Types.ObjectId;
  customer: mongoose.Schema.Types.ObjectId;
  customId: string;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
  manager: mongoose.Schema.Types.ObjectId;
  previoudCustomId?: string;
  statusHistory: mongoose.Schema.Types.ObjectId[];
  title: string;
  status: mongoose.Schema.Types.ObjectId;
  location: mongoose.Schema.Types.ObjectId;
}

const ProjectSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    customId: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", required: true },
    previoudCustomId: { type: String },
    statusHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "StatusHistory", required: true }],
    title: { type: String, required: true },
    status: { type: mongoose.Schema.Types.ObjectId, ref: "Status", required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true }
  },
  { timestamps: true }
);

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/project.ts
import { Request } from "express";
import { ProjectModel } from "../models/project";
import { IProject, ICreateProject, IUpdateProject } from "../../interfaces/project";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectRepository {
  public async getProjects(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProject[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      const projects = await ProjectModel.find(query)
        .populate("admin customer manager status location")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ProjectModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: projects,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjects");
      throw error;
    }
  }

  public async getProjectById(req: Request, id: string): Promise<IProject> {
    try {
      const project = await ProjectModel.findById(id)
        .populate("admin customer manager status location")
        .lean();
      if (!project || project.isDeleted) {
        throw new Error("Project not found");
      }
      return project;
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjectById");
      throw error;
    }
  }

  public async createProject(
    req: Request,
    projectData: ICreateProject
  ): Promise<IProject> {
    try {
      const newProject = await ProjectModel.create(projectData);
      return newProject.toObject();
    } catch (error) {
      await logError(error, req, "ProjectRepository-createProject");
      throw error;
    }
  }

  public async updateProject(
    req: Request,
    id: string,
    projectData: Partial<IUpdateProject>
  ): Promise<IProject> {
    try {
      const updatedProject = await ProjectModel.findByIdAndUpdate(id, projectData, {
        new: true,
      }).populate("admin customer manager status location");
      if (!updatedProject || updatedProject.isDeleted) {
        throw new Error("Failed to update project");
      }
      return updatedProject.toObject();
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProject");
      throw error;
    }
  }

  public async deleteProject(req: Request, id: string): Promise<IProject> {
    try {
      const deletedProject = await ProjectModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).populate("admin customer manager status location");
      if (!deletedProject) {
        throw new Error("Failed to delete project");
      }
      return deletedProject.toObject();
    } catch (error) {
      await logError(error, req, "ProjectRepository-deleteProject");
      throw error;
    }
  }
}

export default ProjectRepository;
EOT

# Create service
cat <<EOT > src/services/project.ts
import { Request, Response } from "express";
import ProjectRepository from "../database/repositories/project";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectService {
  private projectRepository: ProjectRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
  }

  public async getProjects(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projects = await this.projectRepository.getProjects(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(projects, "Projects retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectService-getProjects");
      res.sendError(error, "Projects retrieval failed");
    }
  }

  public async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await this.projectRepository.getProjectById(req, id);
      res.sendFormatted(project, "Project retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectService-getProject");
      res.sendError(error, "Project retrieval failed");
    }
  }

  public async createProject(req: Request, res: Response) {
    try {
      const projectData = req.body;
      const newProject = await this.projectRepository.createProject(req, projectData);
      res.sendFormatted(newProject, "Project created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectService-createProject");
      res.sendError(error, "Project creation failed");
    }
  }

  public async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectData = req.body;
      const updatedProject = await this.projectRepository.updateProject(
        req,
        id,
        projectData
      );
      res.sendFormatted(updatedProject, "Project updated successfully");
    } catch (error) {
      await logError(error, req, "ProjectService-updateProject");
      res.sendError(error, "Project update failed");
    }
  }

  public async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProject = await this.projectRepository.deleteProject(req, id);
      res.sendFormatted(deletedProject, "Project deleted successfully");
    } catch (error) {
      await logError(error, req, "ProjectService-deleteProject");
      res.sendError(error, "Project deletion failed");
    }
  }
}

export default ProjectService;
EOT

# Create middleware
cat <<EOT > src/middlewares/project.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectMiddleware {
  public async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { admin, customer, customId, description, manager, status, title, location } = req.body;
      if (!admin || !customer || !customId || !description || !manager || !status || !title || !location) {
        res.sendError(
          "ValidationError: Admin, Customer, CustomId, Description, Manager, Status, Title, and Location must be provided",
          "Admin, Customer, CustomId, Description, Manager, Status, Title, and Location must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { admin, customer, customId, description, manager, status, title, location } = req.body;
      if (!admin || !customer || !customId || !description || !manager || !status || !title || !location) {
        res.sendError(
          "ValidationError: Admin, Customer, CustomId, Description, Manager, Status, Title, and Location must be provided",
          "Admin, Customer, CustomId, Description, Manager, Status, Title, and Location must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteProject(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getProject(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/project.ts
import { IAdmin } from "./admin";
import { ICustomer } from "./customer";
import { IManager } from "./manager";
import { IStatus } from "./status";
import { ILocation } from "./location";

export interface IProject {
  _id: string;
  admin: IAdmin;
  customer: ICustomer;
  customId: string;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
  manager: IManager;
  previoudCustomId?: string;
  statusHistory: mongoose.Schema.Types.ObjectId[];
  title: string;
  status: IStatus;
  location: ILocation;
}

export interface ICreateProject {
  admin: string;
  customer: string;
  customId: string;
  description: string;
  isActive?: boolean; 
  isDeleted?: boolean;
  manager: string;
  previoudCustomId?: string;
  statusHistory: string[];
  title: string;
  status: string;
  location: string;
}

export interface IUpdateProject {
  admin?: string;
  customer?: string;
  customId?: string;
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  manager?: string;
  previoudCustomId?: string;
  statusHistory?: string[];
  title?: string;
  status?: string;
  location?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/projectRoute.ts
import { Router } from "express";
import ProjectService from "../services/project";
import ProjectMiddleware from "../middlewares/project";

const router = Router();
const projectService = new ProjectService();
const projectMiddleware = new ProjectMiddleware();

router.get(
  "/",
  projectMiddleware.getProject.bind(projectMiddleware),
  projectService.getProjects.bind(projectService)
);
router.get(
  "/:id",
  projectMiddleware.getProject.bind(projectMiddleware),
  projectService.getProject.bind(projectService)
);
router.post(
  "/",
  projectMiddleware.createProject.bind(projectMiddleware),
  projectService.createProject.bind(projectService)
);
router.put(
  "/:id",
  projectMiddleware.updateProject.bind(projectMiddleware),
  projectService.updateProject.bind(projectService)
);
router.delete(
  "/:id",
  projectMiddleware.deleteProject.bind(projectMiddleware),
  projectService.deleteProject.bind(projectService)
);

export default router;
EOT

echo "Project module generated successfully."
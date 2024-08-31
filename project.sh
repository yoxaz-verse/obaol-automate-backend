#!/bin/bash

# Create model
cat <<EOT > src/database/models/project.ts
import mongoose from "mongoose";
import { CustomerModel } from "./customer";
import { AdminModel } from "./admin";
import { ManagerModel } from "./manager";
import { ProjectStatusModel } from "./projectStatus";

interface IProject extends mongoose.Document {
  title: string;
  description: string;
  customId: string;
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  admin: mongoose.Schema.Types.ObjectId | typeof AdminModel;
  manager: mongoose.Schema.Types.ObjectId | typeof ManagerModel;
  status: mongoose.Schema.Types.ObjectId | typeof ProjectStatusModel;
  statusHistory: Array<mongoose.Schema.Types.ObjectId | typeof ProjectStatusModel>;
  isActive: boolean;
  isDeleted: boolean;
}

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    customId: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", required: true },
    status: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectStatus", required: true },
    statusHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProjectStatus" }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Custom ID generator
ProjectSchema.pre('validate', function(next) {
  if (!this.customId && this.isNew) {
    const location = this.get('location');  // Assuming location is provided
    if (location) {
      const customId = `${location.nation.slice(0, 2).toUpperCase()}${location.city.slice(0, 2).toUpperCase()}${location.region.slice(0, 2).toUpperCase()}${location.province.slice(0, 2).toUpperCase()}`;
      this.customId = customId;
    }
  }
  next();
});

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
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ProjectModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: projects as IProject[],
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
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .lean();
      if (!project) {
        throw new Error("Project not found");
      }
      return project as IProject;
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
      })
      .populate("customer")
      .populate("admin")
      .populate("manager")
      .populate("status");
      if (!updatedProject) {
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
      const deletedProject = await ProjectModel.findByIdAndDelete(id);
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
      const { title, description, customer, admin, manager, status } = req.body;
      if (!title || !description || !customer || !admin || !manager || !status) {
        res.sendError(
          "ValidationError: Title, Description, Customer, Admin, Manager, and Status must be provided",
          "Title, Description, Customer, Admin, Manager, and Status must be provided",
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
      const { title, description, customer, admin, manager, status } = req.body;
      if (!title && !description && !customer && !admin && !manager && !status) {
        res.sendError(
          "ValidationError: Title, Description, Customer, Admin, Manager, or Status must be provided",
          "Title, Description, Customer, Admin, Manager, or Status must be provided",
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
import { ICustomer } from "./customer";
import { IAdmin } from "./admin";
import { IManager } from "./manager";
import { IProjectStatus } from "./projectStatus";

export interface IProject {
  _id: string;
  title: string;
  description: string;
  customId: string;
  customer: string | ICustomer;
  admin: string | IAdmin;
  manager: string | IManager;
  status: string | IProjectStatus;
  statusHistory: string[];
  isActive: boolean;
  isDeleted: boolean;
}

export interface ICreateProject {
  title: string;
  description: string;
  customer: string;
  admin: string;
  manager: string;
  status: string;
}

export interface IUpdateProject {
  title?: string;
  description?: string;
  customer?: string;
  admin?: string;
  manager?: string;
  status?: string;
}
EOT


echo "Project module generated successfully."

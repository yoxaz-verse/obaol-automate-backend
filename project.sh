#!/bin/bash

# create-project.sh - A script to generate the Project module with boilerplate code

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
echo_info "Creating Model for Project..."

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
  budget: string;
  prevCustomId: string;
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  admin: mongoose.Schema.Types.ObjectId | typeof AdminModel;
  manager: mongoose.Schema.Types.ObjectId | typeof ManagerModel;
  status: mongoose.Schema.Types.ObjectId | typeof ProjectStatusModel;
  statusHistory: mongoose.Schema.Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
  // Add any additional fields if necessary
}

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    customId: { type: String, required: true, unique: true },
    budget: { type: String, required: true, unique: true },
    prevCustomId: { type: String, unique: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectStatus",
      required: true,
    },
    statusHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ProjectStatus" },
    ],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    // Add any additional fields if necessary
  },
  { timestamps: true }
);

// Custom ID generator
ProjectSchema.pre<IProject>("validate", function (next) {
  if (!this.customId && this.isNew) {
    const location = this.get("location"); // Ensure 'location' is handled appropriately
    if (location) {
      const customId = \`\${location.nation.slice(0, 2).toUpperCase()}\${location.city.slice(0, 2).toUpperCase()}\${location.region.slice(0, 2).toUpperCase()}\${location.province.slice(0, 2).toUpperCase()}\`;
      this.customId = customId;
    }
  }
  next();
});

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);
EOT

# 2. Create Interface
echo_info "Creating Interface for Project..."

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
  budget: string;
  prevCustomId: string;
  customer: ICustomer;
  admin: IAdmin;
  manager: IManager;
  status: IProjectStatus;
  statusHistory: IProjectStatus[];
  isActive: boolean;
  isDeleted: boolean;
  // Add any additional fields if necessary
}

export interface ICreateProject {
  title: string;
  description: string;
  budget: string;
  customer: string; // Customer ID
  admin: string;    // Admin ID
  manager: string;  // Manager ID
  status: string;   // ProjectStatus ID
  // Add any additional fields if necessary
}

export interface IUpdateProject {
  title?: string;
  description?: string;
  budget?: string;
  customer?: string; // Customer ID
  admin?: string;    // Admin ID
  manager?: string;  // Manager ID
  status?: string;   // ProjectStatus ID
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}
EOT

# 3. Create Repository
echo_info "Creating Repository for Project..."

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
        query.title = { \$regex: search, \$options: "i" };
      }
      const projects = await ProjectModel.find(query)
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IProject[]>();

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
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .lean<IProject>();
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
      return newProject.toObject() as IProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-createProject");
      throw error;
    }
  }

  public async updateProject(
    req: Request,
    id: string,
    projectData: IUpdateProject
  ): Promise<IProject> {
    try {
      const updatedProject = await ProjectModel.findByIdAndUpdate(id, projectData, {
        new: true,
      })
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .lean<IProject>();
      if (!updatedProject || updatedProject.isDeleted) {
        throw new Error("Failed to update project");
      }
      return updatedProject;
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
      )
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .lean<IProject>();
      if (!deletedProject) {
        throw new Error("Failed to delete project");
      }
      return deletedProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-deleteProject");
      throw error;
    }
  }
}

export default ProjectRepository;
EOT

# 4. Create Service
echo_info "Creating Service for Project..."

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
      const projects = await this.projectRepository.getProjects(req, pagination, search);
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
      const updatedProject = await this.projectRepository.updateProject(req, id, projectData);
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

# 5. Create Middleware
echo_info "Creating Middleware for Project..."

cat <<EOT > src/middlewares/project.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, budget, customer, admin, manager, status } = req.body;
      if (!title || !description || !budget || !customer || !admin || !manager || !status) {
        res.sendError(
          "ValidationError: Title, Description, Budget, Customer, Admin, Manager, and Status are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "ProjectMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, budget, customer, admin, manager, status, isActive, isDeleted } = req.body;
      if (!title && !description && !budget && !customer && !admin && !manager && !status && isActive === undefined && isDeleted === undefined) {
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
      await logError(error, req, "ProjectMiddleware-validateUpdate");
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
      await logError(error, req, "ProjectMiddleware-validateDelete");
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
      await logError(error, req, "ProjectMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectMiddleware;
EOT

# 6. Create Interface
echo_info "Creating Interface for Project..."

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
  budget: string;
  prevCustomId: string;
  customer: ICustomer;
  admin: IAdmin;
  manager: IManager;
  status: IProjectStatus;
  statusHistory: IProjectStatus[];
  isActive: boolean;
  isDeleted: boolean;
  // Add any additional fields if necessary
}

export interface ICreateProject {
  title: string;
  description: string;
  budget: string;
  customer: string; // Customer ID
  admin: string;    // Admin ID
  manager: string;  // Manager ID
  status: string;   // ProjectStatus ID
  // Add any additional fields if necessary
}

export interface IUpdateProject {
  title?: string;
  description?: string;
  budget?: string;
  customer?: string; // Customer ID
  admin?: string;    // Admin ID
  manager?: string;  // Manager ID
  status?: string;   // ProjectStatus ID
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}
EOT

# 7. Create Routes
echo_info "Creating Routes for Project..."

cat <<EOT > src/routes/projectRoute.ts
import { Router } from "express";
import ProjectService from "../services/project";
import ProjectMiddleware from "../middlewares/project";

const router = Router();
const projectService = new ProjectService();
const projectMiddleware = new ProjectMiddleware();

// GET all projects
router.get(
  "/",
  projectService.getProjects.bind(projectService)
);

// GET project by ID
router.get(
  "/:id",
  projectMiddleware.validateGet.bind(projectMiddleware),
  projectService.getProject.bind(projectService)
);

// CREATE a new project
router.post(
  "/",
  projectMiddleware.validateCreate.bind(projectMiddleware),
  projectService.createProject.bind(projectService)
);

// UPDATE a project
router.patch(
  "/:id",
  projectMiddleware.validateUpdate.bind(projectMiddleware),
  projectService.updateProject.bind(projectService)
);

// DELETE a project
router.delete(
  "/:id",
  projectMiddleware.validateDelete.bind(projectMiddleware),
  projectService.deleteProject.bind(projectService)
);

export default router;
EOT

# 8. Register Routes in Main Routes File
echo_info "Registering Project routes in the main routes file..."

MAIN_ROUTE_FILE="src/routes/index.ts"

if [ ! -f "$MAIN_ROUTE_FILE" ]; then
  echo_info "Creating main routes file..."
  mkdir -p src/routes
  cat <<EOT > "$MAIN_ROUTE_FILE"
import { Router } from "express";
import projectRoute from "./projectRoute";
// Import other routes here

const router = Router();

// Register Project routes
router.use("/projects", projectRoute);

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
  echo_info "Main routes file already exists. Please ensure that '/api/projects' is correctly registered."
fi

# 9. Final Message
echo_info "Project module generated successfully."
echo_info "You can now start using the Project routes at '/api/projects'."

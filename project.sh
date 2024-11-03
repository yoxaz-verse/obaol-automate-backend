  #!/bin/bash

# Exit on any command failure
set -e

# Define directory and file paths
BASE_DIR="src"
MODEL_DIR="$BASE_DIR/database/models"
INTERFACE_DIR="$BASE_DIR/database/interfaces"
REPO_DIR="$BASE_DIR/database/repositories"
SERVICE_DIR="$BASE_DIR/services"
MIDDLEWARE_DIR="$BASE_DIR/middlewares"
ROUTE_DIR="$BASE_DIR/routes"
UTILS_DIR="$BASE_DIR/utils"

# Install necessary packages
echo "Installing required packages..."
npm install mongoose joi express --save
npm install @types/mongoose @types/joi @types/express --save-dev

# Create necessary directories
echo "Creating directory structure..."
mkdir -p $MODEL_DIR $INTERFACE_DIR $REPO_DIR $SERVICE_DIR $MIDDLEWARE_DIR $ROUTE_DIR $UTILS_DIR

# Project Interface
echo "Creating project interface..."
cat <<EOL > $INTERFACE_DIR/project.ts
import mongoose from "mongoose";
import { CustomerModel } from "../models/customer";
import { AdminModel } from "../models/admin";
import { ManagerModel } from "../models/manager";
import { ProjectStatusModel } from "../models/projectStatus";
import { ProjectTypeModel } from "../models/projectType";

export interface IProject extends mongoose.Document {
  title: string;
  description: string;
  customId: string;
  prevCustomId: string;
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  admin: mongoose.Schema.Types.ObjectId | typeof AdminModel;
  manager: mongoose.Schema.Types.ObjectId | typeof ManagerModel;
  status: mongoose.Schema.Types.ObjectId | typeof ProjectStatusModel;
  type: mongoose.Schema.Types.ObjectId | typeof ProjectTypeModel;
  task: string;
  orderNumber: string;
  assignmentDate: Date;
  schedaRadioDate: Date;
  statusHistory: mongoose.Schema.Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
}
EOL

# Project Model
echo "Creating project model..."
cat <<EOL > $MODEL_DIR/project.ts
import mongoose from "mongoose";
import { IProject } from "../interfaces/project";

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    customId: { type: String, required: true, unique: true },
    prevCustomId: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", required: true },
    status: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectStatus", required: true },
    type: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectType", required: true },
    task: { type: String, required: true },
    orderNumber: { type: String, required: true },
    assignmentDate: { type: Date, required: true },
    schedaRadioDate: { type: Date, required: true },
    statusHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProjectStatus" }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Custom ID generator
ProjectSchema.pre<IProject>("validate", function (next) {
  if (!this.customId && this.isNew) {
    const location = this.get("location"); 
    if (location) {
      const customId = \`\${location.nation.slice(0, 2).toUpperCase()}\${location.city.slice(0, 2).toUpperCase()}\${location.region.slice(0, 2).toUpperCase()}\${location.province.slice(0, 2).toUpperCase()}\`;
      this.customId = customId;
    }
  }
  next();
});

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);
EOL

# Project Repository
echo "Creating project repository..."
cat <<EOL > $REPO_DIR/project.ts
import { Request } from "express";
import { ProjectModel } from "../models/project";
import { logError } from "../../utils/errorLogger";

class ProjectRepository {
  public async getProjects(req: Request, pagination: { page: number; limit: number }, search: string) {
    try {
      const query: any = { isDeleted: false };
      if (search) query.title = { $regex: search, $options: "i" };

      const totalCount = await ProjectModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const projects = await ProjectModel.find(query)
        .populate("customer admin manager status type")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: projects, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjects");
      throw error;
    }
  }

  public async getProject(req: Request, id: string) {
    try {
      return await ProjectModel.findById(id).populate("customer admin manager status type").exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProject");
      throw error;
    }
  }

  public async createProject(req: Request, projectData: any) {
    try {
      const newProject = new ProjectModel(projectData);
      return await newProject.save();
    } catch (error) {
      await logError(error, req, "ProjectRepository-createProject");
      throw error;
    }
  }

  public async updateProject(req: Request, id: string, projectData: any) {
    try {
      return await ProjectModel.findByIdAndUpdate(id, projectData, { new: true }).populate("customer admin manager status type").exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProject");
      throw error;
    }
  }

  public async deleteProject(req: Request, id: string) {
    try {
      return await ProjectModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true }).populate("customer admin manager status type").exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-deleteProject");
      throw error;
    }
  }
}

export default ProjectRepository;
EOL

# Project Service
echo "Creating project service..."
cat <<EOL > $SERVICE_DIR/project.ts
import { Request, Response } from "express";
import ProjectRepository from "../repositories/project";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";

class ProjectService {
  private projectRepository = new ProjectRepository();

  public async getProjects(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projects = await this.projectRepository.getProjects(req, pagination, search);
      res.sendFormatted(projects, "Projects retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-getProjects");
      res.sendError("Failed to retrieve projects", 500);
    }
  }

  public async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await this.projectRepository.getProject(req, id);
      res.sendFormatted(project, "Project retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-getProject");
      res.sendError("Failed to retrieve project", 500);
    }
  }

  public async createProject(req: Request, res: Response) {
    try {
      const projectData = req.body;
      const newProject = await this.projectRepository.createProject(req, projectData);
      res.sendFormatted(newProject, "Project created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectService-createProject");
      res.sendError("Project creation failed", 500);
    }
  }

  public async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectData = req.body;
      const updatedProject = await this.projectRepository.updateProject(req, id, projectData);
      res.sendFormatted(updatedProject, "Project updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-updateProject");
      res.sendError("Project update failed", 500);
    }
  }

  public async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProject = await this.projectRepository.deleteProject(req, id);
      res.sendFormatted(deletedProject, "Project deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-deleteProject");
      res.sendError("Project deletion failed", 500);
    }
  }
}

export default ProjectService;
EOL

# Project Middleware
echo "Creating project middleware..."
cat <<EOL > $MIDDLEWARE_DIR/project.ts
import { Request, Response, NextFunction } from "express";
import Joi from "joi";

class ProjectMiddleware {
  public validateCreate(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      title: Joi.string().required(),
      description: Joi.string().required(),
      customId: Joi.string().optional(),
      prevCustomId: Joi.string().optional(),
      customer: Joi.string().required(),
      admin: Joi.string().required(),
      manager: Joi.string().required(),
      status: Joi.string().required(),
      type: Joi.string().required(),
      task: Joi.string().required(),
      orderNumber: Joi.string().required(),
      assignmentDate: Joi.date().required(),
      schedaRadioDate: Joi.date().required(),
      statusHistory: Joi.array().items(Joi.string()),
      isActive: Joi.boolean(),
      isDeleted: Joi.boolean()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }

  public validateGet(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      id: Joi.string().required()
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }

  public validateUpdate(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      title: Joi.string().optional(),
      description: Joi.string().optional(),
      customId: Joi.string().optional(),
      prevCustomId: Joi.string().optional(),
      customer: Joi.string().optional(),
      admin: Joi.string().optional(),
      manager: Joi.string().optional(),
      status: Joi.string().optional(),
      type: Joi.string().optional(),
      task: Joi.string().optional(),
      orderNumber: Joi.string().optional(),
      assignmentDate: Joi.date().optional(),
      schedaRadioDate: Joi.date().optional(),
      statusHistory: Joi.array().items(Joi.string()).optional(),
      isActive: Joi.boolean().optional(),
      isDeleted: Joi.boolean().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }

  public validateDelete(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      id: Joi.string().required()
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }
}

export default ProjectMiddleware;
EOL

# Project Routes
echo "Creating project routes..."
cat <<EOL > $ROUTE_DIR/project.ts
import { Router } from "express";
import ProjectService from "../services/project";
import ProjectMiddleware from "../middlewares/project";

const router = Router();
const projectService = new ProjectService();
const projectMiddleware = new ProjectMiddleware();

// GET all projects
router.get("/", projectService.getProjects.bind(projectService));

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
EOL

echo "Setup complete! All project module components have been created."  

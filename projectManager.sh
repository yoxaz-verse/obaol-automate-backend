#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display usage instructions
usage() {
  echo "Usage: ./setup_project_manager.sh"
  exit 1
}

# Check if script is run from the project root by looking for package.json
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Please run this script from the project root."
  usage
fi

echo "✅ Project root confirmed."

# Define directories
SRC_DIR="src"
MODEL_DIR="$SRC_DIR/database/models"
REPO_DIR="$SRC_DIR/database/repositories"
SERVICE_DIR="$SRC_DIR/services"
MIDDLEWARE_DIR="$SRC_DIR/middlewares"
ROUTES_DIR="$SRC_DIR/routes"
INTERFACES_DIR="$SRC_DIR/interfaces"
UTILS_DIR="$SRC_DIR/utils"
TYPES_DIR="$SRC_DIR/types"

# Create directories if they don't exist
echo "🗂️ Creating necessary directories..."
mkdir -p "$MODEL_DIR" "$REPO_DIR" "$SERVICE_DIR" "$MIDDLEWARE_DIR" "$ROUTES_DIR" "$INTERFACES_DIR" "$UTILS_DIR" "$TYPES_DIR"

# Function to create or overwrite a file with content
create_or_overwrite_file() {
  local FILE_PATH=$1
  local CONTENT=$2

  if [ -f "$FILE_PATH" ]; then
    echo "📝 Overwriting existing file at $FILE_PATH."
  else
    echo "📝 Creating file at $FILE_PATH."
  fi

  echo "$CONTENT" > "$FILE_PATH"
  echo "✅ $FILE_PATH has been set up."
}

# 1. Create ProjectManager Interface
INTERFACE_FILE="$INTERFACES_DIR/projectManager.ts"
INTERFACE_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";

export interface IProjectManager {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  projectId?: string; // Unique identifier for the project
  role: string; // Role of the project manager
}

export interface ICreateProjectManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
  projectId: string; // Unique identifier for the project
}

export interface IUpdateProjectManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  projectId?: string;
  isActive?: boolean;
}
EOL
)

create_or_overwrite_file "$INTERFACE_FILE" "$INTERFACE_CONTENT"

# 2. Create ProjectManager Model
MODEL_FILE="$MODEL_DIR/projectManager.ts"
MODEL_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";
import { IProjectManager } from "../../interfaces/projectManager";

const ProjectManagerSchema = new mongoose.Schema<IProjectManager>(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Linking to Admin
    projectId: { type: String, required: true }, // Identifier for the project
    role: { type: String, default: "projectManager" }, // Assign default role
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
/*
import bcrypt from "bcrypt";

ProjectManagerSchema.pre<IProjectManager>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
*/

export const ProjectManagerModel = mongoose.model<IProjectManager>("ProjectManager", ProjectManagerSchema);
EOL
)

create_or_overwrite_file "$MODEL_FILE" "$MODEL_CONTENT"

# 3. Create ProjectManager Repository
REPO_FILE="$REPO_DIR/projectManager.ts"
REPO_CONTENT=$(cat <<'EOL'
import { Request } from "express";
import { ProjectManagerModel } from "../models/projectManager";
import { ICreateProjectManager, IUpdateProjectManager } from "../../interfaces/projectManager";
import { logError } from "../../utils/errorLogger";
import { IProjectManager } from "../../interfaces/projectManager";

class ProjectManagerRepository {
  public async getProjectManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IProjectManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ProjectManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const projectManagers = await ProjectManagerModel.find(query)
        .populate("admin", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: projectManagers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ProjectManagerRepository-getProjectManagers");
      throw error;
    }
  }

  public async getProjectManagerById(req: Request, id: string): Promise<IProjectManager> {
    try {
      const projectManagerDoc = await ProjectManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "name");

      if (!projectManagerDoc) {
        throw new Error("ProjectManager not found");
      }

      return projectManagerDoc;
    } catch (error) {
      await logError(error, req, "ProjectManagerRepository-getProjectManagerById");
      throw error;
    }
  }

  public async createProjectManager(
    req: Request,
    projectManagerData: ICreateProjectManager
  ): Promise<IProjectManager> {
    try {
      const newProjectManager = await ProjectManagerModel.create(projectManagerData);
      return newProjectManager;
    } catch (error) {
      await logError(error, req, "ProjectManagerRepository-createProjectManager");
      throw error;
    }
  }

  public async updateProjectManager(
    req: Request,
    id: string,
    projectManagerData: Partial<IUpdateProjectManager>
  ): Promise<IProjectManager> {
    try {
      const updatedProjectManager = await ProjectManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        projectManagerData,
        { new: true }
      ).populate("admin", "name");
      if (!updatedProjectManager) {
        throw new Error("Failed to update ProjectManager");
      }
      return updatedProjectManager;
    } catch (error) {
      await logError(error, req, "ProjectManagerRepository-updateProjectManager");
      throw error;
    }
  }

  public async deleteProjectManager(req: Request, id: string): Promise<IProjectManager> {
    try {
      const deletedProjectManager = await ProjectManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "name");
      if (!deletedProjectManager) {
        throw new Error("Failed to delete ProjectManager");
      }
      return deletedProjectManager;
    } catch (error) {
      await logError(error, req, "ProjectManagerRepository-deleteProjectManager");
      throw error;
    }
  }
}

export default ProjectManagerRepository;
EOL
)

create_or_overwrite_file "$REPO_FILE" "$REPO_CONTENT"

# 4. Create ProjectManager Service
SERVICE_FILE="$SERVICE_DIR/projectManager.ts"
SERVICE_CONTENT=$(cat <<'EOL'
// src/services/projectManager.ts

import { Request, Response } from "express";
import ProjectManagerRepository from "../database/repositories/projectManager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectManagerService {
  private projectManagerRepository: ProjectManagerRepository;

  constructor() {
    this.projectManagerRepository = new ProjectManagerRepository();
  }

  public async getProjectManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectManagers = await this.projectManagerRepository.getProjectManagers(
        req,
        pagination,
        search
      );
      res.json(projectManagers);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-getProjectManagers");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async getProjectManagerById(req: Request, res: Response) {
    try {
      const projectManager = await this.projectManagerRepository.getProjectManagerById(req, req.params.id);
      res.json(projectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-getProjectManagerById");
      res.status(404).json({ error: error.message });
    }
  }

  public async createProjectManager(req: Request, res: Response) {
    try {
      const newProjectManager = await this.projectManagerRepository.createProjectManager(req, req.body);
      res.status(201).json(newProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-createProjectManager");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async updateProjectManager(req: Request, res: Response) {
    try {
      const updatedProjectManager = await this.projectManagerRepository.updateProjectManager(
        req,
        req.params.id,
        req.body
      );
      res.json(updatedProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-updateProjectManager");
      res.status(404).json({ error: error.message });
    }
  }

  public async deleteProjectManager(req: Request, res: Response) {
    try {
      const deletedProjectManager = await this.projectManagerRepository.deleteProjectManager(req, req.params.id);
      res.json(deletedProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-deleteProjectManager");
      res.status(404).json({ error: error.message });
    }
  }
}

export default ProjectManagerService;
EOL
)

create_or_overwrite_file "$SERVICE_FILE" "$SERVICE_CONTENT"

# 5. Create ProjectManager Middleware (optional)
MIDDLEWARE_FILE="$MIDDLEWARE_DIR/projectManager.ts"
MIDDLEWARE_CONTENT=$(cat <<'EOL'
// src/middlewares/projectManager.ts

import { Request, Response, NextFunction } from "express";

export const validateProjectManager = (req: Request, res: Response, next: NextFunction) => {
  // Add your validation logic here
  const { email, name, password, admin, projectId } = req.body;
  if (!email || !name || !password || !admin || !projectId) {
    return res.status(400).json({ error: "All fields are required." });
  }
  next();
};
EOL
)

create_or_overwrite_file "$MIDDLEWARE_FILE" "$MIDDLEWARE_CONTENT"

# 6. Create ProjectManager Routes
ROUTE_FILE="$ROUTES_DIR/projectManager.ts"
ROUTE_CONTENT=$(cat <<'EOL'
// src/routes/projectManager.ts

import { Router } from "express";
import ProjectManagerService from "../services/projectManager";
import { validateProjectManager } from "../middlewares/projectManager";

const router = Router();
const projectManagerService = new ProjectManagerService();

router.get("/", projectManagerService.getProjectManagers.bind(projectManagerService));
router.get("/:id", projectManagerService.getProjectManagerById.bind(projectManagerService));
router.post("/", validateProjectManager, projectManagerService.createProjectManager.bind(projectManagerService));
router.put("/:id", validateProjectManager, projectManagerService.updateProjectManager.bind(projectManagerService));
router.delete("/:id", projectManagerService.deleteProjectManager.bind(projectManagerService));

export default router;
EOL
)

create_or_overwrite_file "$ROUTE_FILE" "$ROUTE_CONTENT"

echo "🎉 ProjectManager setup completed successfully!"

#!/bin/bash

# ================================
# Generate ActivityType Module
# ================================

# Create model
mkdir -p src/database/models
cat <<EOT > src/database/models/activityType.ts
import mongoose from "mongoose";

interface IActivityType extends mongoose.Document {
  name: string;
}

const ActivityTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const ActivityTypeModel = mongoose.model<IActivityType>("ActivityType", ActivityTypeSchema);
EOT

# Create repository
mkdir -p src/database/repositories
cat <<EOT > src/database/repositories/activityType.ts
import { Request } from "express";
import { ActivityTypeModel } from "../models/activityType";
import {
  IActivityType,
  ICreateActivityType,
  IUpdateActivityType,
} from "../../interfaces/activityType";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ActivityTypeRepository {
  public async getActivityTypes(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IActivityType[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { \$regex: search, \$options: "i" };
      }

      const activityTypesDoc = await ActivityTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const activityTypes = activityTypesDoc.map((doc) => doc.toObject() as IActivityType);

      const totalCount = await ActivityTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: activityTypes,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-getActivityTypes");
      throw error;
    }
  }

  public async getActivityTypeById(req: Request, id: string): Promise<IActivityType> {
    try {
      const activityTypeDoc = await ActivityTypeModel.findById(id);

      if (!activityTypeDoc) {
        throw new Error("ActivityType not found");
      }

      return activityTypeDoc.toObject() as IActivityType;
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-getActivityTypeById");
      throw error;
    }
  }

  public async createActivityType(
    req: Request,
    activityTypeData: ICreateActivityType
  ): Promise<IActivityType> {
    try {
      const newActivityType = await ActivityTypeModel.create(activityTypeData);
      return newActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-createActivityType");
      throw error;
    }
  }

  public async updateActivityType(
    req: Request,
    id: string,
    activityTypeData: Partial<IUpdateActivityType>
  ): Promise<IActivityType> {
    try {
      const updatedActivityType = await ActivityTypeModel.findByIdAndUpdate(
        id,
        activityTypeData,
        { new: true }
      );
      if (!updatedActivityType) {
        throw new Error("Failed to update ActivityType");
      }
      return updatedActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-updateActivityType");
      throw error;
    }
  }

  public async deleteActivityType(req: Request, id: string): Promise<IActivityType> {
    try {
      const deletedActivityType = await ActivityTypeModel.findByIdAndDelete(id);
      if (!deletedActivityType) {
        throw new Error("Failed to delete ActivityType");
      }
      return deletedActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-deleteActivityType");
      throw error;
    }
  }
}

export default ActivityTypeRepository;
EOT

# Create service
mkdir -p src/services
cat <<EOT > src/services/activityType.ts
import { Request, Response } from "express";
import ActivityTypeRepository from "../database/repositories/activityType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ActivityTypeService {
  private activityTypeRepository: ActivityTypeRepository;

  constructor() {
    this.activityTypeRepository = new ActivityTypeRepository();
  }

  public async getActivityTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityTypes = await this.activityTypeRepository.getActivityTypes(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(activityTypes, "ActivityTypes retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-getActivityTypes");
      res.sendError(error, "ActivityTypes retrieval failed");
    }
  }

  public async getActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityType = await this.activityTypeRepository.getActivityTypeById(req, id);
      res.sendFormatted(activityType, "ActivityType retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-getActivityType");
      res.sendError(error, "ActivityType retrieval failed");
    }
  }

  public async createActivityType(req: Request, res: Response) {
    try {
      const activityTypeData = req.body;
      const newActivityType = await this.activityTypeRepository.createActivityType(req, activityTypeData);
      res.sendFormatted(newActivityType, "ActivityType created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityTypeService-createActivityType");
      res.sendError(error, "ActivityType creation failed");
    }
  }

  public async updateActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityTypeData = req.body;
      const updatedActivityType = await this.activityTypeRepository.updateActivityType(
        req,
        id,
        activityTypeData
      );
      res.sendFormatted(updatedActivityType, "ActivityType updated successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-updateActivityType");
      res.sendError(error, "ActivityType update failed");
    }
  }

  public async deleteActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivityType = await this.activityTypeRepository.deleteActivityType(req, id);
      res.sendFormatted(deletedActivityType, "ActivityType deleted successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-deleteActivityType");
      res.sendError(error, "ActivityType deletion failed");
    }
  }
}

export default ActivityTypeService;
EOT

# Create middleware
mkdir -p src/middlewares
cat <<EOT > src/middlewares/activityType.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityTypeMiddleware {
  public async createActivityType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityTypeCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateActivityType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided for update",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityTypeUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteActivityType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityTypeDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getActivityType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ActivityTypeGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityTypeMiddleware;
EOT

# Create interface
mkdir -p src/interfaces
cat <<EOT > src/interfaces/activityType.ts
export interface IActivityType {
  name: string;
}

export interface ICreateActivityType {
  name: string;
}

export interface IUpdateActivityType {
  name?: string;
}
EOT

# Create routes
mkdir -p src/routes
cat <<EOT > src/routes/activityTypeRoute.ts
import { Router } from "express";
import ActivityTypeService from "../services/activityType";
import ActivityTypeMiddleware from "../middlewares/activityType";

const activityTypeRoute = Router();
const activityTypeService = new ActivityTypeService();
const activityTypeMiddleware = new ActivityTypeMiddleware();

activityTypeRoute.get("/", activityTypeService.getActivityTypes.bind(activityTypeService));
activityTypeRoute.get(
  "/:id",
  activityTypeMiddleware.getActivityType.bind(activityTypeMiddleware),
  activityTypeService.getActivityType.bind(activityTypeService)
);
activityTypeRoute.post(
  "/",
  activityTypeMiddleware.createActivityType.bind(activityTypeMiddleware),
  activityTypeService.createActivityType.bind(activityTypeService)
);
activityTypeRoute.patch(
  "/:id",
  activityTypeMiddleware.updateActivityType.bind(activityTypeMiddleware),
  activityTypeService.updateActivityType.bind(activityTypeService)
);
activityTypeRoute.delete(
  "/:id",
  activityTypeMiddleware.deleteActivityType.bind(activityTypeMiddleware),
  activityTypeService.deleteActivityType.bind(activityTypeService)
);

export default activityTypeRoute;
EOT

echo "ActivityType module generated successfully."

# ================================
# Generate ProjectType Module
# ================================

# Create model
mkdir -p src/database/models
cat <<EOT > src/database/models/projectType.ts
import mongoose from "mongoose";

interface IProjectType extends mongoose.Document {
  name: string;
}

const ProjectTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const ProjectTypeModel = mongoose.model<IProjectType>("ProjectType", ProjectTypeSchema);
EOT

# Create repository
mkdir -p src/database/repositories
cat <<EOT > src/database/repositories/projectType.ts
import { Request } from "express";
import { ProjectTypeModel } from "../models/projectType";
import {
  IProjectType,
  ICreateProjectType,
  IUpdateProjectType,
} from "../../interfaces/projectType";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectTypeRepository {
  public async getProjectTypes(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProjectType[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { \$regex: search, \$options: "i" };
      }

      const projectTypesDoc = await ProjectTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const projectTypes = projectTypesDoc.map((doc) => doc.toObject() as IProjectType);

      const totalCount = await ProjectTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: projectTypes,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-getProjectTypes");
      throw error;
    }
  }

  public async getProjectTypeById(req: Request, id: string): Promise<IProjectType> {
    try {
      const projectTypeDoc = await ProjectTypeModel.findById(id);

      if (!projectTypeDoc) {
        throw new Error("ProjectType not found");
      }

      return projectTypeDoc.toObject() as IProjectType;
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-getProjectTypeById");
      throw error;
    }
  }

  public async createProjectType(
    req: Request,
    projectTypeData: ICreateProjectType
  ): Promise<IProjectType> {
    try {
      const newProjectType = await ProjectTypeModel.create(projectTypeData);
      return newProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-createProjectType");
      throw error;
    }
  }

  public async updateProjectType(
    req: Request,
    id: string,
    projectTypeData: Partial<IUpdateProjectType>
  ): Promise<IProjectType> {
    try {
      const updatedProjectType = await ProjectTypeModel.findByIdAndUpdate(
        id,
        projectTypeData,
        { new: true }
      );
      if (!updatedProjectType) {
        throw new Error("Failed to update ProjectType");
      }
      return updatedProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-updateProjectType");
      throw error;
    }
  }

  public async deleteProjectType(req: Request, id: string): Promise<IProjectType> {
    try {
      const deletedProjectType = await ProjectTypeModel.findByIdAndDelete(id);
      if (!deletedProjectType) {
        throw new Error("Failed to delete ProjectType");
      }
      return deletedProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-deleteProjectType");
      throw error;
    }
  }
}

export default ProjectTypeRepository;
EOT

# Create service
mkdir -p src/services
cat <<EOT > src/services/projectType.ts
import { Request, Response } from "express";
import ProjectTypeRepository from "../database/repositories/projectType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectTypeService {
  private projectTypeRepository: ProjectTypeRepository;

  constructor() {
    this.projectTypeRepository = new ProjectTypeRepository();
  }

  public async getProjectTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectTypes = await this.projectTypeRepository.getProjectTypes(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(projectTypes, "ProjectTypes retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-getProjectTypes");
      res.sendError(error, "ProjectTypes retrieval failed");
    }
  }

  public async getProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectType = await this.projectTypeRepository.getProjectTypeById(req, id);
      res.sendFormatted(projectType, "ProjectType retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-getProjectType");
      res.sendError(error, "ProjectType retrieval failed");
    }
  }

  public async createProjectType(req: Request, res: Response) {
    try {
      const projectTypeData = req.body;
      const newProjectType = await this.projectTypeRepository.createProjectType(req, projectTypeData);
      res.sendFormatted(newProjectType, "ProjectType created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectTypeService-createProjectType");
      res.sendError(error, "ProjectType creation failed");
    }
  }

  public async updateProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectTypeData = req.body;
      const updatedProjectType = await this.projectTypeRepository.updateProjectType(
        req,
        id,
        projectTypeData
      );
      res.sendFormatted(updatedProjectType, "ProjectType updated successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-updateProjectType");
      res.sendError(error, "ProjectType update failed");
    }
  }

  public async deleteProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProjectType = await this.projectTypeRepository.deleteProjectType(req, id);
      res.sendFormatted(deletedProjectType, "ProjectType deleted successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-deleteProjectType");
      res.sendError(error, "ProjectType deletion failed");
    }
  }
}

export default ProjectTypeService;
EOT

# Create middleware
mkdir -p src/middlewares
cat <<EOT > src/middlewares/projectType.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectTypeMiddleware {
  public async createProjectType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectTypeCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateProjectType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided for update",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectTypeUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteProjectType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectTypeDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getProjectType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-ProjectTypeGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectTypeMiddleware;
EOT

# Create interface
mkdir -p src/interfaces
cat <<EOT > src/interfaces/projectType.ts
export interface IProjectType {
  name: string;
}

export interface ICreateProjectType {
  name: string;
}

export interface IUpdateProjectType {
  name?: string;
}
EOT

# Create routes
mkdir -p src/routes
cat <<EOT > src/routes/projectTypeRoute.ts
import { Router } from "express";
import ProjectTypeService from "../services/projectType";
import ProjectTypeMiddleware from "../middlewares/projectType";

const projectTypeRoute = Router();
const projectTypeService = new ProjectTypeService();
const projectTypeMiddleware = new ProjectTypeMiddleware();

projectTypeRoute.get("/", projectTypeService.getProjectTypes.bind(projectTypeService));
projectTypeRoute.get(
  "/:id",
  projectTypeMiddleware.getProjectType.bind(projectTypeMiddleware),
  projectTypeService.getProjectType.bind(projectTypeService)
);
projectTypeRoute.post(
  "/",
  projectTypeMiddleware.createProjectType.bind(projectTypeMiddleware),
  projectTypeService.createProjectType.bind(projectTypeService)
);
projectTypeRoute.patch(
  "/:id",
  projectTypeMiddleware.updateProjectType.bind(projectTypeMiddleware),
  projectTypeService.updateProjectType.bind(projectTypeService)
);
projectTypeRoute.delete(
  "/:id",
  projectTypeMiddleware.deleteProjectType.bind(projectTypeMiddleware),
  projectTypeService.deleteProjectType.bind(projectTypeService)
);

export default projectTypeRoute;
EOT

echo "ProjectType module generated successfully."

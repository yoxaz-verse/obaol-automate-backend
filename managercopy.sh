#!/bin/bash

# Create updated model
mkdir -p src/database/models
cat <<EOT > src/database/models/manager.ts
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

interface IAdmin extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  refreshToken?: string;
  role: string, // Assign default role
  // comparePassword(candidatePassword: string): Promise<boolean>; // Password comparison
}

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    refreshToken: { type: String },
    role: { type: String, default: "admin" }, // Assign default role
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
// adminSchema.pre("save", async function (next) {
//   const admin = this as IAdmin;
//   if (!admin.isModified("password")) return next();k

//   try {
//     const salt = await bcrypt.genSalt(12);
//     admin.password = await bcrypt.hash(admin.password, salt);
//     next();
//   } catch (err) {
//     next();
//   }
// });

// Password comparison method
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);

EOT

# Create updated repository
mkdir -p src/database/repositories
cat <<EOT > src/database/repositories/manager.ts
import { Request } from "express";
import { ManagerModel } from "../models/manager";
import { ICreateManager, IUpdateManager } from "../../interfaces/manager";
import { logError } from "../../utils/errorLogger";
import { IManager } from "../../interfaces/manager";

class ManagerRepository {
  public async getManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const managers = await ManagerModel.find(query)
        .populate("admin", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: managers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagers");
      throw error;
    }
  }

  public async getManagerById(req: Request, id: string): Promise<IManager> {
    try {
      const managerDoc = await ManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "name");

      if (!managerDoc) {
        throw new Error("Manager not found");
      }

      return managerDoc;
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagerById");
      throw error;
    }
  }

  public async createManager(
    req: Request,
    managerData: ICreateManager
  ): Promise<IManager> {
    try {
      const newManager = await ManagerModel.create(managerData);
      return newManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-createManager");
      throw error;
    }
  }

  public async updateManager(
    req: Request,
    id: string,
    managerData: Partial<IUpdateManager>
  ): Promise<IManager> {
    try {
      const updatedManager = await ManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        managerData,
        { new: true }
      ).populate("admin", "name");
      if (!updatedManager) {
        throw new Error("Failed to update manager");
      }
      return updatedManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-updateManager");
      throw error;
    }
  }

  public async deleteManager(req: Request, id: string): Promise<IManager> {
    try {
      const deletedManager = await ManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "name");
      if (!deletedManager) {
        throw new Error("Failed to delete manager");
      }
      return deletedManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-deleteManager");
      throw error;
    }
  }
}

export default ManagerRepository;

EOT

# Create updated service with file handling
mkdir -p src/services
cat <<EOT > src/services/manager.ts
// src/services/manager.ts

import { Request, Response } from "express";
import ManagerRepository from "../database/repositories/manager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ManagerService {
  private managerRepository: ManagerRepository;

  constructor() {
    this.managerRepository = new ManagerRepository();
  }

  public async getManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const managers = await this.managerRepository.getManagers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(managers, "Managers retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-getManagers");
      res.sendError(error, "Managers retrieval failed", 500);
    }
  }

  public async getManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const manager = await this.managerRepository.getManagerById(req, id);

      if (!manager) {
        res.sendError("Manager not found", "Manager retrieval failed", 404);
        return;
      }

      res.sendFormatted(manager, "Manager retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-getManager");
      res.sendError(error, "Manager retrieval failed", 500);
    }
  }

  public async createManager(req: Request, res: Response) {
    try {
      const managerData = req.body;
      console.log(req.body);

      // Integrate fileId and fileURL received from another API
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        managerData.fileId = fileId;
        managerData.fileURL = fileURL;
      } else {
        res.sendError(
          "fileId and fileURL must be provided",
          "Invalid input data",
          400
        );
        return;
      }

      const newManager = await this.managerRepository.createManager(
        req,
        managerData
      );

      res.sendFormatted(newManager, "Manager created successfully", 201);
    } catch (error) {
      await logError(error, req, "ManagerService-createManager");
      res.sendError(error, "Manager creation failed", 500);
    }
  }

  public async updateManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const managerData = req.body;

      // Integrate fileId and fileURL received from another API, if provided
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        managerData.fileId = fileId;
        managerData.fileURL = fileURL;
      }

      const updatedManager = await this.managerRepository.updateManager(
        req,
        id,
        managerData
      );

      if (!updatedManager) {
        res.sendError(
          "Manager not found or no changes made",
          "Manager update failed",
          404
        );
        return;
      }

      res.sendFormatted(updatedManager, "Manager updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-updateManager");
      res.sendError(error, "Manager update failed", 500);
    }
  }

  public async deleteManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedManager = await this.managerRepository.deleteManager(
        req,
        id
      );

      if (!deletedManager) {
        res.sendError(
          "Manager not found or already deleted",
          "Manager deletion failed",
          404
        );
        return;
      }

      res.sendFormatted(deletedManager, "Manager deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-deleteManager");
      res.sendError(error, "Manager deletion failed", 500);
    }
  }
}

export default ManagerService;

EOT

# Create updated middleware to handle file uploads
mkdir -p src/middlewares
cat <<EOT > src/middlewares/manager.ts
// src/middlewares/manager.ts

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ManagerMiddleware {
  public async createManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin, fileId, fileURL } = req.body;
      if (!email || !name || !password || !admin || !fileId || !fileURL) {
        res.sendError(
          "error",
          "Email, Name, Password, Admin,  fileId, and fileURL must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin,  fileId, fileURL } = req.body;
      if (
        !email &&
        !name &&
        !password &&
        !admin &&
        !fileId &&
        !fileURL
      ) {
        res.sendError(
          "error",
          "At least one field (Email, Name, Password, Admin, Role, fileId, or fileURL) must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(id, "ID must be provided", 400);
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(id, "ID must be provided", 400);
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ManagerMiddleware;

EOT

# Create interface
mkdir -p src/interfaces
cat <<EOT > src/interfaces/manager.ts
import mongoose from "mongoose";

export interface IManager {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  fileId?: string; // Unique identifier for the uploaded file
  fileURL?: string; // URL to access the uploaded file
  role: string; // Role of the manager
}

export interface ICreateManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
  fileId: string;
  fileURL: string;
}

export interface IUpdateManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  fileId?: string;
  fileURL?: string;
  isActive?: boolean;
}

EOT

# Create updated routes with upload handling
mkdir -p src/routes
cat <<EOT > src/routes/managerRoute.ts
import { Router } from "express";
import ManagerService from "../services/manager";
import ManagerMiddleware from "../middlewares/manager";

const managerRoute = Router();
const managerService = new ManagerService();
const managerMiddleware = new ManagerMiddleware();

// GET /api/managers - Retrieve all managers
managerRoute.get("/", managerService.getManagers.bind(managerService));

// GET /api/managers/:id - Retrieve a specific manager
managerRoute.get(
  "/:id",
  managerMiddleware.getManager.bind(managerMiddleware),
  managerService.getManager.bind(managerService)
);

// POST /api/managers - Create a new manager
managerRoute.post(
  "/",
  // managerMiddleware.uploadFile, // Assuming uploadFile is defined if needed
  managerMiddleware.createManager.bind(managerMiddleware),
  managerService.createManager.bind(managerService)
);

// PATCH /api/managers/:id - Update an existing manager
managerRoute.patch(
  "/:id",
  // managerMiddleware.uploadFile, // Assuming uploadFile is defined if needed
  managerMiddleware.updateManager.bind(managerMiddleware),
  managerService.updateManager.bind(managerService)
);

// DELETE /api/managers/:id - Delete a manager
managerRoute.delete(
  "/:id",
  managerMiddleware.deleteManager.bind(managerMiddleware),
  managerService.deleteManager.bind(managerService)
);

export default managerRoute;

EOT

# Ensure uploads directory exists
mkdir -p uploads/managers

echo "Updated Manager module with Uppy integration generated successfully."

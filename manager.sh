#!/bin/bash

# Create model
cat <<EOT > src/database/models/manager.ts
import mongoose from "mongoose";
import { AdminModel } from "./admin";

interface IManager extends mongoose.Document {
  Admin: mongoose.Schema.Types.ObjectId;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
}

const ManagerSchema = new mongoose.Schema(
  {
    Admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

export const ManagerModel = mongoose.model<IManager>("Manager", ManagerSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/manager.ts
import { Request } from "express";
import { ManagerModel } from "../models/manager";
import { IManager, ICreateManager, IUpdateManager } from "../../interfaces/manager";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ManagerRepository {
  public async getManagers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IManager[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const managers = await ManagerModel.find(query)
        .populate("Admin")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: managers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagers");
      throw error;
    }
  }

  public async getManagerById(req: Request, id: string): Promise<IManager> {
    try {
      const manager = await ManagerModel.findById(id).populate("Admin").lean();
      if (!manager || manager.isDeleted) {
        throw new Error("Manager not found");
      }
      return manager;
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
      return newManager.toObject();
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
      const updatedManager = await ManagerModel.findByIdAndUpdate(id, managerData, {
        new: true,
      }).populate("Admin");
      if (!updatedManager || updatedManager.isDeleted) {
        throw new Error("Failed to update manager");
      }
      return updatedManager.toObject();
    } catch (error) {
      await logError(error, req, "ManagerRepository-updateManager");
      throw error;
    }
  }

  public async deleteManager(req: Request, id: string): Promise<IManager> {
    try {
      const deletedManager = await ManagerModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).populate("Admin");
      if (!deletedManager) {
        throw new Error("Failed to delete manager");
      }
      return deletedManager.toObject();
    } catch (error) {
      await logError(error, req, "ManagerRepository-deleteManager");
      throw error;
    }
  }
}

export default ManagerRepository;
EOT

# Create service
cat <<EOT > src/services/manager.ts
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
      res.sendArrayFormatted(managers, "Managers retrieved successfully");
    } catch (error) {
      await logError(error, req, "ManagerService-getManagers");
      res.sendError(error, "Managers retrieval failed");
    }
  }

  public async getManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const manager = await this.managerRepository.getManagerById(req, id);
      res.sendFormatted(manager, "Manager retrieved successfully");
    } catch (error) {
      await logError(error, req, "ManagerService-getManager");
      res.sendError(error, "Manager retrieval failed");
    }
  }

  public async createManager(req: Request, res: Response) {
    try {
      const managerData = req.body;
      const newManager = await this.managerRepository.createManager(req, managerData);
      res.sendFormatted(newManager, "Manager created successfully", 201);
    } catch (error) {
      await logError(error, req, "ManagerService-createManager");
      res.sendError(error, "Manager creation failed");
    }
  }

  public async updateManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const managerData = req.body;
      const updatedManager = await this.managerRepository.updateManager(
        req,
        id,
        managerData
      );
      res.sendFormatted(updatedManager, "Manager updated successfully");
    } catch (error) {
      await logError(error, req, "ManagerService-updateManager");
      res.sendError(error, "Manager update failed");
    }
  }

  public async deleteManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedManager = await this.managerRepository.deleteManager(req, id);
      res.sendFormatted(deletedManager, "Manager deleted successfully");
    } catch (error) {
      await logError(error, req, "ManagerService-deleteManager");
      res.sendError(error, "Manager deletion failed");
    }
  }
}

export default ManagerService;
EOT

# Create middleware
cat <<EOT > src/middlewares/manager.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ManagerMiddleware {
  public async createManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { Admin, email, name, password } = req.body;
      if (!Admin || !email || !name || !password) {
        res.sendError(
          "ValidationError: Admin, Email, Name, and Password must be provided",
          "Admin, Email, Name, and Password must be provided",
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
      const { Admin, email, name, password } = req.body;
      if (!Admin || !email || !name || !password) {
        res.sendError(
          "ValidationError: Admin, Email, Name, and Password must be provided",
          "Admin, Email, Name, and Password must be provided",
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
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
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
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
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
cat <<EOT > src/interfaces/manager.ts
import { IAdmin } from "./admin";

export interface IManager {
  _id: string;
  Admin: IAdmin;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
}

export interface ICreateManager {
  Admin: string;
  email: string;
  isActive?: boolean; 
  isDeleted?: boolean;
  name: string;
  password: string;
}

export interface IUpdateManager {
  Admin?: string;
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name?: string;
  password?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/managerRoute.ts
import { Router } from "express";
import ManagerService from "../services/manager";
import ManagerMiddleware from "../middlewares/manager";

const router = Router();
const managerService = new ManagerService();
const managerMiddleware = new ManagerMiddleware();

router.get(
  "/",
  managerMiddleware.getManager.bind(managerMiddleware),
  managerService.getManagers.bind(managerService)
);
router.get(
  "/:id",
  managerMiddleware.getManager.bind(managerMiddleware),
  managerService.getManager.bind(managerService)
);
router.post(
  "/",
  managerMiddleware.createManager.bind(managerMiddleware),
  managerService.createManager.bind(managerService)
);
router.put(
  "/:id",
  managerMiddleware.updateManager.bind(managerMiddleware),
  managerService.updateManager.bind(managerService)
);
router.delete(
  "/:id",
  managerMiddleware.deleteManager.bind(managerMiddleware),
  managerService.deleteManager.bind(managerService)
);

export default router;
EOT

echo "Manager module generated successfully."
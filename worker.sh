#!/bin/bash

# Create model
cat <<EOT > src/database/models/worker.ts
import mongoose from "mongoose";
import { ServiceCompanyModel } from "./serviceCompany";

interface IWorker extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isService: boolean;
  name: string;
  password: string;
  serviceCompany: mongoose.Schema.Types.ObjectId | typeof ServiceCompanyModel;
}

const WorkerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isService: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    serviceCompany: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceCompany", required: true }
  },
  { timestamps: true }
);

export const WorkerModel = mongoose.model<IWorker>("Worker", WorkerSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/worker.ts
import { Request } from "express";
import { WorkerModel } from "../models/worker";
import { IWorker, ICreateWorker, IUpdateWorker } from "../../interfaces/worker";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class WorkerRepository {
  public async getWorkers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IWorker[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const workers = await WorkerModel.find(query)
        .populate("serviceCompany")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await WorkerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: workers as IWorker[],
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "WorkerRepository-getWorkers");
      throw error;
    }
  }

  public async getWorkerById(req: Request, id: string): Promise<IWorker> {
    try {
      const worker = await WorkerModel.findById(id)
        .populate("serviceCompany")
        .lean();
      if (!worker || worker.isDeleted) {
        throw new Error("Worker not found");
      }
      return worker as IWorker;
    } catch (error) {
      await logError(error, req, "WorkerRepository-getWorkerById");
      throw error;
    }
  }

  public async createWorker(
    req: Request,
    workerData: ICreateWorker
  ): Promise<IWorker> {
    try {
      const newWorker = await WorkerModel.create(workerData);
      return newWorker.toObject();
    } catch (error) {
      await logError(error, req, "WorkerRepository-createWorker");
      throw error;
    }
  }

  public async updateWorker(
    req: Request,
    id: string,
    workerData: Partial<IUpdateWorker>
  ): Promise<IWorker> {
    try {
      const updatedWorker = await WorkerModel.findByIdAndUpdate(id, workerData, {
        new: true,
      }).populate("serviceCompany");
      if (!updatedWorker || updatedWorker.isDeleted) {
        throw new Error("Failed to update worker");
      }
      return updatedWorker.toObject();
    } catch (error) {
      await logError(error, req, "WorkerRepository-updateWorker");
      throw error;
    }
  }

  public async deleteWorker(req: Request, id: string): Promise<IWorker> {
    try {
      const deletedWorker = await WorkerModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).populate("serviceCompany");
      if (!deletedWorker) {
        throw new Error("Failed to delete worker");
      }
      return deletedWorker.toObject();
    } catch (error) {
      await logError(error, req, "WorkerRepository-deleteWorker");
      throw error;
    }
  }
}

export default WorkerRepository;
EOT

# Create service
cat <<EOT > src/services/worker.ts
import { Request, Response } from "express";
import WorkerRepository from "../database/repositories/worker";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class WorkerService {
  private workerRepository: WorkerRepository;

  constructor() {
    this.workerRepository = new WorkerRepository();
  }

  public async getWorkers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const workers = await this.workerRepository.getWorkers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(workers, "Workers retrieved successfully");
    } catch (error) {
      await logError(error, req, "WorkerService-getWorkers");
      res.sendError(error, "Workers retrieval failed");
    }
  }

  public async getWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const worker = await this.workerRepository.getWorkerById(req, id);
      res.sendFormatted(worker, "Worker retrieved successfully");
    } catch (error) {
      await logError(error, req, "WorkerService-getWorker");
      res.sendError(error, "Worker retrieval failed");
    }
  }

  public async createWorker(req: Request, res: Response) {
    try {
      const workerData = req.body;
      const newWorker = await this.workerRepository.createWorker(req, workerData);
      res.sendFormatted(newWorker, "Worker created successfully", 201);
    } catch (error) {
      await logError(error, req, "WorkerService-createWorker");
      res.sendError(error, "Worker creation failed");
    }
  }

  public async updateWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workerData = req.body;
      const updatedWorker = await this.workerRepository.updateWorker(
        req,
        id,
        workerData
      );
      res.sendFormatted(updatedWorker, "Worker updated successfully");
    } catch (error) {
      await logError(error, req, "WorkerService-updateWorker");
      res.sendError(error, "Worker update failed");
    }
  }

  public async deleteWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedWorker = await this.workerRepository.deleteWorker(req, id);
      res.sendFormatted(deletedWorker, "Worker deleted successfully");
    } catch (error) {
      await logError(error, req, "WorkerService-deleteWorker");
      res.sendError(error, "Worker deletion failed");
    }
  }
}

export default WorkerService;
EOT

# Create middleware
cat <<EOT > src/middlewares/worker.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class WorkerMiddleware {
  public async createWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, serviceCompany } = req.body;
      if (!email || !name || !password || !serviceCompany) {
        res.sendError(
          "ValidationError: Email, Name, Password, and ServiceCompany must be provided",
          "Email, Name, Password, and ServiceCompany must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-WorkerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, serviceCompany } = req.body;
      if (!email && !name && !password && !serviceCompany) {
        res.sendError(
          "ValidationError: Email, Name, Password, and ServiceCompany must be provided",
          "Email, Name, Password, and ServiceCompany must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-WorkerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteWorker(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-WorkerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getWorker(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-WorkerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default WorkerMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/worker.ts
import { IServiceCompany } from "./serviceCompany";
import mongoose from "mongoose";

export interface IWorker {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isService: boolean;
  name: string;
  password: string;
  serviceCompany: mongoose.Schema.Types.ObjectId | IServiceCompany;
}

export interface ICreateWorker {
  email: string;
  isActive?: boolean; 
  isDeleted?: boolean;
  isService?: boolean;
  name: string;
  password: string;
  serviceCompany: string;
}

export interface IUpdateWorker {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isService?: boolean;
  name?: string;
  password?: string;
  serviceCompany?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/workerRoute.ts
import { Router } from "express";
import WorkerService from "../services/worker";
import WorkerMiddleware from "../middlewares/worker";

const router = Router();
const workerService = new WorkerService();
const workerMiddleware = new WorkerMiddleware();

router.get(
  "/",
  workerService.getWorkers.bind(workerService)
);
router.get(
  "/:id",
  workerMiddleware.getWorker.bind(workerMiddleware),
  workerService.getWorker.bind(workerService)
);
router.post(
  "/",
  workerMiddleware.createWorker.bind(workerMiddleware),
  workerService.createWorker.bind(workerService)
);
router.patch(
  "/:id",
  workerMiddleware.updateWorker.bind(workerMiddleware),
  workerService.updateWorker.bind(workerService)
);
router.delete(
  "/:id",
  workerMiddleware.deleteWorker.bind(workerMiddleware),
  workerService.deleteWorker.bind(workerService)
);

export default router;
EOT

echo "Worker module generated successfully."

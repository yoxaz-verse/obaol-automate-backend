#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to create directories if they don't exist
create_dir() {
  mkdir -p "$1"
}

# Function to create files with content
create_file() {
  local path=$1
  shift
  cat <<EOT > "$path"
$*
EOT
}

# Create Worker Model
create_dir src/database/models
create_file src/database/models/worker.ts \
"import mongoose from 'mongoose';
import { ServiceCompanyModel } from './serviceCompany';

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
    serviceCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCompany', required: true }
  },
  { timestamps: true }
);

export const WorkerModel = mongoose.model<IWorker>('Worker', WorkerSchema);
"

# Create Worker Repository
create_dir src/database/repositories
create_file src/database/repositories/worker.ts \
"import { Request } from 'express';
import { WorkerModel } from '../models/worker';
import {
  IWorker,
  ICreateWorker,
  IUpdateWorker,
} from '../../interfaces/worker';
import { logError } from '../../utils/errorLogger';
import { IPagination } from '../../interfaces/pagination';

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
      let query: any = { isDeleted: false };
      if (search) {
        query.name = { \$regex: search, \$options: 'i' };
      }

      const workersDoc = await WorkerModel.find(query)
        .populate('serviceCompany', 'name')
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const workers = workersDoc.map((doc) => doc.toObject() as IWorker);

      const totalCount = await WorkerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: workers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, 'WorkerRepository-getWorkers');
      throw error;
    }
  }

  public async getWorkerById(req: Request, id: string): Promise<IWorker> {
    try {
      const workerDoc = await WorkerModel.findById(id).populate('serviceCompany', 'name');

      if (!workerDoc) {
        throw new Error('Worker not found');
      }

      return workerDoc.toObject() as IWorker;
    } catch (error) {
      await logError(error, req, 'WorkerRepository-getWorkerById');
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
      await logError(error, req, 'WorkerRepository-createWorker');
      throw error;
    }
  }

  public async updateWorker(
    req: Request,
    id: string,
    workerData: Partial<IUpdateWorker>
  ): Promise<IWorker> {
    try {
      const updatedWorker = await WorkerModel.findByIdAndUpdate(
        id,
        workerData,
        { new: true }
      ).populate('serviceCompany');
      if (!updatedWorker) {
        throw new Error('Failed to update Worker');
      }
      return updatedWorker.toObject();
    } catch (error) {
      await logError(error, req, 'WorkerRepository-updateWorker');
      throw error;
    }
  }

  public async deleteWorker(req: Request, id: string): Promise<IWorker> {
    try {
      const deletedWorker = await WorkerModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true }).populate('serviceCompany');
      if (!deletedWorker) {
        throw new Error('Failed to delete Worker');
      }
      return deletedWorker.toObject();
    } catch (error) {
      await logError(error, req, 'WorkerRepository-deleteWorker');
      throw error;
    }
  }
}

export default WorkerRepository;
"

# Create Worker Service
create_dir src/services
create_file src/services/worker.ts \
"import { Request, Response } from 'express';
import WorkerRepository from '../database/repositories/worker';
import { logError } from '../utils/errorLogger';
import { paginationHandler } from '../utils/paginationHandler';
import { searchHandler } from '../utils/searchHandler';

class WorkerService {
  private workerRepository: WorkerRepository;

  constructor() {
    this.workerRepository = new WorkerRepository();
  }

  public async getWorkers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const workers = await this.workerRepository.getWorkers(req, pagination, search);
      res.sendArrayFormatted(workers, 'Workers retrieved successfully');
    } catch (error) {
      await logError(error, req, 'WorkerService-getWorkers');
      res.sendError(error, 'Workers retrieval failed');
    }
  }

  public async getWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const worker = await this.workerRepository.getWorkerById(req, id);
      res.sendFormatted(worker, 'Worker retrieved successfully');
    } catch (error) {
      await logError(error, req, 'WorkerService-getWorker');
      res.sendError(error, 'Worker retrieval failed');
    }
  }

  public async createWorker(req: Request, res: Response) {
    try {
      const workerData = req.body;
      const newWorker = await this.workerRepository.createWorker(req, workerData);
      res.sendFormatted(newWorker, 'Worker created successfully', 201);
    } catch (error) {
      await logError(error, req, 'WorkerService-createWorker');
      res.sendError(error, 'Worker creation failed');
    }
  }

  public async updateWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workerData = req.body;
      const updatedWorker = await this.workerRepository.updateWorker(req, id, workerData);
      res.sendFormatted(updatedWorker, 'Worker updated successfully');
    } catch (error) {
      await logError(error, req, 'WorkerService-updateWorker');
      res.sendError(error, 'Worker update failed');
    }
  }

  public async deleteWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedWorker = await this.workerRepository.deleteWorker(req, id);
      res.sendFormatted(deletedWorker, 'Worker deleted successfully');
    } catch (error) {
      await logError(error, req, 'WorkerService-deleteWorker');
      res.sendError(error, 'Worker deletion failed');
    }
  }
}

export default WorkerService;
"

# Create Worker Middleware
create_dir src/middlewares
create_file src/middlewares/worker.ts \
"import { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/errorLogger';

class WorkerMiddleware {
  public async createWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, serviceCompany } = req.body;
      if (!email || !name || !password || !serviceCompany) {
        res.sendError(
          'ValidationError: Email, Name, Password, and ServiceCompany must be provided',
          'Email, Name, Password, and ServiceCompany must be provided',
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, 'Middleware-WorkerCreate');
      res.sendError(error, 'An unexpected error occurred', 500);
    }
  }

  public async updateWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, serviceCompany } = req.body;
      if (!email && !name && !password && !serviceCompany) {
        res.sendError(
          'ValidationError: At least one field (Email, Name, Password, or ServiceCompany) must be provided',
          'At least one field (Email, Name, Password, or ServiceCompany) must be provided',
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, 'Middleware-WorkerUpdate');
      res.sendError(error, 'An unexpected error occurred', 500);
    }
  }

  public async deleteWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          'ValidationError: ID must be provided',
          'ID must be provided',
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, 'Middleware-WorkerDelete');
      res.sendError(error, 'An unexpected error occurred', 500);
    }
  }

  public async getWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          'ValidationError: ID must be provided',
          'ID must be provided',
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, 'Middleware-WorkerGet');
      res.sendError(error, 'An unexpected error occurred', 500);
    }
  }
}

export default WorkerMiddleware;
"

# Create Worker Interface
create_dir src/interfaces
create_file src/interfaces/worker.ts \
"import mongoose from 'mongoose';

export interface IWorker {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isService: boolean;
  name: string;
  password: string;
  serviceCompany: mongoose.Schema.Types.ObjectId | string;
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
"

# Create Worker Routes
create_dir src/routes
create_file src/routes/workerRoute.ts \
"import { Router } from 'express';
import WorkerService from '../services/worker';
import WorkerMiddleware from '../middlewares/worker';

const workerRoute = Router();
const workerService = new WorkerService();
const workerMiddleware = new WorkerMiddleware();

workerRoute.get('/', workerService.getWorkers.bind(workerService));
workerRoute.get(
  '/:id',
  workerMiddleware.getWorker.bind(workerMiddleware),
  workerService.getWorker.bind(workerService)
);
workerRoute.post(
  '/',
  workerMiddleware.createWorker.bind(workerMiddleware),
  workerService.createWorker.bind(workerService)
);
workerRoute.patch(
  '/:id',
  workerMiddleware.updateWorker.bind(workerMiddleware),
  workerService.updateWorker.bind(workerService)
);
workerRoute.delete(
  '/:id',
  workerMiddleware.deleteWorker.bind(workerMiddleware),
  workerService.deleteWorker.bind(workerService)
);

export default workerRoute;
"

# Completion Message
echo "Worker module generated successfully."

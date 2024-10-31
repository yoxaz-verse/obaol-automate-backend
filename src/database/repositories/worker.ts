import { Request } from 'express';
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
        query.name = { $regex: search, $options: 'i' };
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


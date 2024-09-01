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
        .populate("serviceCompany") // Ensure proper population
        .lean(); // Use lean to return plain JavaScript objects

      // Map the result to the IWorker interface
      const mappedWorkers = workers.map((worker) => ({
        ...worker,
        serviceCompany:
          worker.serviceCompany?._id?.toString() ||
          worker.serviceCompany?.toString(),
      }));

      const totalCount = await WorkerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: mappedWorkers as IWorker[],
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

      if (!worker) {
        throw new Error("Worker not found");
      }

      return {
        ...worker,
        serviceCompany:
          worker.serviceCompany?._id?.toString() ||
          worker.serviceCompany?.toString(),
      } as IWorker;
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
      return newWorker.toObject<IWorker>(); // Convert to plain JavaScript object
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
      const updatedWorker = await WorkerModel.findByIdAndUpdate(
        id,
        workerData,
        {
          new: true,
        }
      )
        .populate("serviceCompany")
        .lean();

      if (!updatedWorker) {
        throw new Error("Failed to update worker");
      }

      return {
        ...updatedWorker,
        serviceCompany:
          updatedWorker.serviceCompany?._id?.toString() ||
          updatedWorker.serviceCompany?.toString(),
      } as IWorker;
    } catch (error) {
      await logError(error, req, "WorkerRepository-updateWorker");
      throw error;
    }
  }

  public async deleteWorker(req: Request, id: string): Promise<IWorker> {
    try {
      const deletedWorker = await WorkerModel.findByIdAndDelete(id).lean();

      if (!deletedWorker) {
        throw new Error("Failed to delete worker");
      }

      return {
        ...deletedWorker,
        serviceCompany:
          deletedWorker.serviceCompany?._id?.toString() ||
          deletedWorker.serviceCompany?.toString(),
      } as IWorker;
    } catch (error) {
      await logError(error, req, "WorkerRepository-deleteWorker");
      throw error;
    }
  }
}

export default WorkerRepository;

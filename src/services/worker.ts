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

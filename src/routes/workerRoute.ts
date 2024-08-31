import { Router } from "express";
import WorkerService from "../services/worker";
import WorkerMiddleware from "../middlewares/worker";

const workerRoute = Router();
const workerService = new WorkerService();
const workerMiddleware = new WorkerMiddleware();

workerRoute.get("/", workerService.getWorkers.bind(workerService));
workerRoute.get(
  "/:id",
  workerMiddleware.getWorker.bind(workerMiddleware),
  workerService.getWorker.bind(workerService)
);
workerRoute.post(
  "/",
  workerMiddleware.createWorker.bind(workerMiddleware),
  workerService.createWorker.bind(workerService)
);
workerRoute.patch(
  "/:id",
  workerMiddleware.updateWorker.bind(workerMiddleware),
  workerService.updateWorker.bind(workerService)
);
workerRoute.delete(
  "/:id",
  workerMiddleware.deleteWorker.bind(workerMiddleware),
  workerService.deleteWorker.bind(workerService)
);

export default workerRoute;

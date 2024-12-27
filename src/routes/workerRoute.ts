import { Router } from "express";
import WorkerService from "../services/worker";
import WorkerMiddleware from "../middlewares/worker";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";

const workerRoute = Router();
const workerService = new WorkerService();
const workerMiddleware = new WorkerMiddleware();

workerRoute.get(
  "/",
  authenticateToken,
  workerService.getWorkers.bind(workerService)
);
workerRoute.get(
  "/:id",
  authenticateToken,
  workerMiddleware.getWorker.bind(workerMiddleware),
  workerService.getWorker.bind(workerService)
);
workerRoute.post(
  "/",
  authenticateToken,
  validateUniqueEmail,
  workerMiddleware.createWorker.bind(workerMiddleware),
  workerService.createWorker.bind(workerService)
);
workerRoute.patch(
  "/:id",
  authenticateToken,
  workerMiddleware.updateWorker.bind(workerMiddleware),
  workerService.updateWorker.bind(workerService)
);
workerRoute.delete(
  "/:id",
  authenticateToken,
  workerMiddleware.deleteWorker.bind(workerMiddleware),
  workerService.deleteWorker.bind(workerService)
);

export default workerRoute;

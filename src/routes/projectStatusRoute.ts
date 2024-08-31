import { Router } from "express";
import ProjectStatusService from "../services/projectStatus";
import ProjectStatusMiddleware from "../middlewares/projectStatus";

const router = Router();
const projectStatusService = new ProjectStatusService();
const projectStatusMiddleware = new ProjectStatusMiddleware();

router.get(
  "/",
  projectStatusService.getProjectStatuses.bind(projectStatusService)
);
router.get(
  "/:id",
  projectStatusMiddleware.getProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.getProjectStatus.bind(projectStatusService)
);
router.post(
  "/",
  projectStatusMiddleware.createProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.createProjectStatus.bind(projectStatusService)
);
router.patch(
  "/:id",
  projectStatusMiddleware.updateProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.updateProjectStatus.bind(projectStatusService)
);
router.delete(
  "/:id",
  projectStatusMiddleware.deleteProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.deleteProjectStatus.bind(projectStatusService)
);

export default router;

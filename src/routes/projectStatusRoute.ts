import { Router } from "express";
import ProjectStatusService from "../services/projectStatus";
import ProjectStatusMiddleware from "../middlewares/projectStatus";
import authenticateToken from "../middlewares/auth";

const router = Router();
const projectStatusService = new ProjectStatusService();
const projectStatusMiddleware = new ProjectStatusMiddleware();

router.get(
  "/",
  authenticateToken,
  projectStatusService.getProjectStatuses.bind(projectStatusService)
);
router.get(
  "/:id",
  authenticateToken,

  projectStatusMiddleware.getProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.getProjectStatus.bind(projectStatusService)
);
router.post(
  "/",
  authenticateToken,
  projectStatusMiddleware.createProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.createProjectStatus.bind(projectStatusService)
);
router.patch(
  "/:id",
  authenticateToken,
  projectStatusMiddleware.updateProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.updateProjectStatus.bind(projectStatusService)
);
router.delete(
  "/:id",
  authenticateToken,
  projectStatusMiddleware.deleteProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.deleteProjectStatus.bind(projectStatusService)
);

export default router;

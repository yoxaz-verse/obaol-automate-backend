// src/routes/projectManager.ts

import { Router } from "express";
import { validateProjectManager } from "../middlewares/projectManager";
import ProjectManagerService from "../services/ProjectManager";

const router = Router();
const projectManagerService = new ProjectManagerService();

router.get(
  "/",
  projectManagerService.getProjectManagers.bind(projectManagerService)
);
router.get(
  "/:id",
  projectManagerService.getProjectManagerById.bind(projectManagerService)
);
router.post(
  "/",
  validateProjectManager,
  projectManagerService.createProjectManager.bind(projectManagerService)
);
router.put(
  "/:id",
  validateProjectManager,
  projectManagerService.updateProjectManager.bind(projectManagerService)
);
router.delete(
  "/:id",
  projectManagerService.deleteProjectManager.bind(projectManagerService)
);

export default router;

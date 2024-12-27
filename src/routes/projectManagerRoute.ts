// src/routes/projectManager.ts

import { Router } from "express";
import { validateProjectManager } from "../middlewares/projectManager";
import ProjectManagerService from "../services/ProjectManager";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";

const router = Router();
const projectManagerService = new ProjectManagerService();

router.get(
  "/",
  authenticateToken,
  projectManagerService.getProjectManagers.bind(projectManagerService)
);
router.get(
  "/:id",
  authenticateToken,
  projectManagerService.getProjectManagerById.bind(projectManagerService)
);
router.post(
  "/",
  validateUniqueEmail,
  authenticateToken,
  validateProjectManager,
  projectManagerService.createProjectManager.bind(projectManagerService)
);
router.patch(
  "/:id",
  // validateProjectManager,
  projectManagerService.updateProjectManager.bind(projectManagerService)
);
router.delete(
  "/:id",
  authenticateToken,
  projectManagerService.deleteProjectManager.bind(projectManagerService)
);

export default router;

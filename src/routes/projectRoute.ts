import { Router } from "express";
import ProjectService from "../services/project";
import ProjectMiddleware from "../middlewares/project";
import authenticateToken from "../middlewares/auth";

const router = Router();
const projectService = new ProjectService();
const projectMiddleware = new ProjectMiddleware();

// GET all projects
router.get(
  "/",
  authenticateToken,
  projectService.getProjects.bind(projectService)
);

// GET project by ID
router.get(
  "/:id",
  authenticateToken,
  projectMiddleware.validateGet.bind(projectMiddleware),
  projectService.getProject.bind(projectService)
);

// CREATE a new project
router.post(
  "/",
  authenticateToken,
  projectMiddleware.validateCreate.bind(projectMiddleware),
  projectService.createProject.bind(projectService)
);

// UPDATE a project
router.patch(
  "/:id",
  authenticateToken,
  projectMiddleware.validateUpdate.bind(projectMiddleware),
  projectService.updateProject.bind(projectService)
);

// DELETE a project
router.delete(
  "/:id",
  authenticateToken,
  projectMiddleware.validateDelete.bind(projectMiddleware),
  projectService.deleteProject.bind(projectService)
);

export default router;

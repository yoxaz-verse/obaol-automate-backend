import { Router } from "express";
import ProjectService from "../services/project";
import ProjectMiddleware from "../middlewares/project";

const router = Router();
const projectService = new ProjectService();
const projectMiddleware = new ProjectMiddleware();

// GET all projects
router.get(
  "/",
  projectService.getProjects.bind(projectService)
);

// GET project by ID
router.get(
  "/:id",
  projectMiddleware.validateGet.bind(projectMiddleware),
  projectService.getProject.bind(projectService)
);

// CREATE a new project
router.post(
  "/",
  projectMiddleware.validateCreate.bind(projectMiddleware),
  projectService.createProject.bind(projectService)
);

// UPDATE a project
router.patch(
  "/:id",
  projectMiddleware.validateUpdate.bind(projectMiddleware),
  projectService.updateProject.bind(projectService)
);

// DELETE a project
router.delete(
  "/:id",
  projectMiddleware.validateDelete.bind(projectMiddleware),
  projectService.deleteProject.bind(projectService)
);

export default router;

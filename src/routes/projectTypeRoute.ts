import { Router } from "express";
import ProjectTypeService from "../services/projectType";
import ProjectTypeMiddleware from "../middlewares/projectType";
import authorizeRoles from "../middlewares/roleMiddleware";
import authenticateToken from "../middlewares/auth";

const projectTypeRoute = Router();
const projectTypeService = new ProjectTypeService();
const projectTypeMiddleware = new ProjectTypeMiddleware();

projectTypeRoute.get(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  projectTypeService.getProjectTypes.bind(projectTypeService)
);
projectTypeRoute.get(
  "/:id",
  authenticateToken,

  authorizeRoles("Admin"),
  projectTypeMiddleware.getProjectType.bind(projectTypeMiddleware),
  projectTypeService.getProjectType.bind(projectTypeService)
);
projectTypeRoute.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  projectTypeMiddleware.createProjectType.bind(projectTypeMiddleware),
  projectTypeService.createProjectType.bind(projectTypeService)
);
projectTypeRoute.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  projectTypeMiddleware.updateProjectType.bind(projectTypeMiddleware),
  projectTypeService.updateProjectType.bind(projectTypeService)
);
projectTypeRoute.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  projectTypeMiddleware.deleteProjectType.bind(projectTypeMiddleware),
  projectTypeService.deleteProjectType.bind(projectTypeService)
);

export default projectTypeRoute;

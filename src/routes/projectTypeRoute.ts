import { Router } from "express";
import ProjectTypeService from "../services/projectType";
import ProjectTypeMiddleware from "../middlewares/projectType";

const projectTypeRoute = Router();
const projectTypeService = new ProjectTypeService();
const projectTypeMiddleware = new ProjectTypeMiddleware();

projectTypeRoute.get("/", projectTypeService.getProjectTypes.bind(projectTypeService));
projectTypeRoute.get(
  "/:id",
  projectTypeMiddleware.getProjectType.bind(projectTypeMiddleware),
  projectTypeService.getProjectType.bind(projectTypeService)
);
projectTypeRoute.post(
  "/",
  projectTypeMiddleware.createProjectType.bind(projectTypeMiddleware),
  projectTypeService.createProjectType.bind(projectTypeService)
);
projectTypeRoute.patch(
  "/:id",
  projectTypeMiddleware.updateProjectType.bind(projectTypeMiddleware),
  projectTypeService.updateProjectType.bind(projectTypeService)
);
projectTypeRoute.delete(
  "/:id",
  projectTypeMiddleware.deleteProjectType.bind(projectTypeMiddleware),
  projectTypeService.deleteProjectType.bind(projectTypeService)
);

export default projectTypeRoute;

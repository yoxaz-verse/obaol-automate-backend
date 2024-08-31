import { Router } from "express";
import ProjectService from "../services/project";
import ProjectMiddleware from "../middlewares/project";

const projectroute = Router();
const projectService = new ProjectService();
const projectMiddleware = new ProjectMiddleware();

projectroute.get("/", projectService.getProjects.bind(projectService));
projectroute.get(
  "/:id",
  projectMiddleware.getProject.bind(projectMiddleware),
  projectService.getProject.bind(projectService)
);
projectroute.post(
  "/",
  projectMiddleware.createProject.bind(projectMiddleware),
  projectService.createProject.bind(projectService)
);
projectroute.patch(
  "/:id",
  projectMiddleware.updateProject.bind(projectMiddleware),
  projectService.updateProject.bind(projectService)
);
projectroute.delete(
  "/:id",
  projectMiddleware.deleteProject.bind(projectMiddleware),
  projectService.deleteProject.bind(projectService)
);

export default projectroute;

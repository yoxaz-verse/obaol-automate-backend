import { Request, Response } from "express";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";
import ProjectRepository from "../database/repositories/project";

class ProjectService {
  private projectRepository = new ProjectRepository();

  public async getProjects(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projects = await this.projectRepository.getProjects(
        req,
        pagination,
        search
      );
      res.sendFormatted(projects, "Projects retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-getProjects");
      res.sendError(error, "Failed to retrieve projects", 500);
    }
  }

  public async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await this.projectRepository.getProject(req, id);
      res.sendFormatted(project, "Project retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-getProject");
      res.sendError(error, "Failed to retrieve project", 500);
    }
  }

  public async createProject(req: Request, res: Response) {
    try {
      const projectData = req.body;
      const newProject = await this.projectRepository.createProject(
        req,
        projectData
      );
      res.sendFormatted(newProject, "Project created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectService-createProject");
      res.sendError(error, "Project creation failed", 500);
    }
  }

  public async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectData = req.body;
      const updatedProject = await this.projectRepository.updateProject(
        req,
        id,
        projectData
      );
      res.sendFormatted(updatedProject, "Project updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-updateProject");
      res.sendError(error, "Project update failed", 500);
    }
  }

  public async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProject = await this.projectRepository.deleteProject(
        req,
        id
      );
      res.sendFormatted(deletedProject, "Project deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-deleteProject");
      res.sendError(error, "Project deletion failed", 500);
    }
  }
}

export default ProjectService;

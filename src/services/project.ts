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
    // try {
    //   const { id } = req.params;
    //   const project = await this.projectRepository.getProject(req, id);
    //   res.sendFormatted(project, "Project retrieved successfully", 200);
    // } catch (error) {
    //   await logError(error, req, "ProjectService-getProject");
    //   res.sendError(error, "Failed to retrieve project", 500);
    // }
    try {
      const project = await this.projectRepository.getProject(
        req,
        req.params.id
      );
      res.json(project);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-getProjectManagerById");
      res.status(404).json({ error: error });
    }
  }

  public async createProject(req: Request, res: Response) {
    try {
      const projectData = req.body;

      // Create the project
      const newProject = await this.projectRepository.createProject(
        req,
        projectData
      );
      if (!newProject._id) {
        return;
      }
      // Set initial status (for example, "Created")
      // const initialStatusId = "64e1f0123b9e3c456789abcd"; // Replace with actual status ID for "Created"
      // await this.projectRepository.updateProjectStatus(
      //   req,
      //   newProject._id as any,
      //   initialStatusId as any
      // );

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

      // Update the project data
      const updatedProject = await this.projectRepository.updateProject(
        req,
        id,
        projectData
      );

      // Handle status updates if `status` is included in the payload
      if (projectData.status) {
        await this.projectRepository.updateProjectStatus(
          req,
          id,
          projectData.status
        );
      }

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

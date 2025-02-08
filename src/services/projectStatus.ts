import { Request, Response } from "express";
import ProjectStatusRepository from "../database/repositories/projectStatus";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectStatusService {
  private projectStatusRepository: ProjectStatusRepository;

  constructor() {
    this.projectStatusRepository = new ProjectStatusRepository();
  }

  public async getProjectStatuses(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectStatuses =
        await this.projectStatusRepository.getProjectStatuses(
          req,
          pagination,
          search
        );
      res.sendArrayFormatted(
        projectStatuses,
        "Project statuses retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ProjectStatusService-getProjectStatuses");
      res.sendError(error, "Project statuses retrieval failed");
    }
  }

  public async getProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectStatus =
        await this.projectStatusRepository.getProjectStatusById(req, id);
      res.sendFormatted(projectStatus, "Project status retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-getProjectStatus");
      res.sendError(error, "Project status retrieval failed");
    }
  }

  public async createProjectStatus(req: Request, res: Response) {
    try {
      const projectStatusData = req.body;
      const newProjectStatus =
        await this.projectStatusRepository.createProjectStatus(
          req,
          projectStatusData
        );
      res.sendFormatted(
        newProjectStatus,
        "Project status created successfully",
        201
      );
    } catch (error) {
      await logError(error, req, "ProjectStatusService-createProjectStatus");
      res.sendError(error, "Project status creation failed");
    }
  }

  public async updateProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectStatusData = req.body;
      const updatedProjectStatus =
        await this.projectStatusRepository.updateProjectStatus(
          req,
          id,
          projectStatusData
        );
      res.sendFormatted(
        updatedProjectStatus,
        "Project status updated successfully"
      );
    } catch (error) {
      await logError(error, req, "ProjectStatusService-updateProjectStatus");
      res.sendError(error, "Project status update failed");
    }
  }

  public async deleteProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProjectStatus =
        await this.projectStatusRepository.deleteProjectStatus(req, id);
      res.sendFormatted(
        deletedProjectStatus,
        "Project status deleted successfully"
      );
    } catch (error) {
      await logError(error, req, "ProjectStatusService-deleteProjectStatus");
      res.sendError(error, "Project status deletion failed");
    }
  }
}

export default ProjectStatusService;

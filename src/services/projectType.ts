import { Request, Response } from "express";
import ProjectTypeRepository from "../database/repositories/projectType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectTypeService {
  private projectTypeRepository: ProjectTypeRepository;

  constructor() {
    this.projectTypeRepository = new ProjectTypeRepository();
  }

  public async getProjectTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectTypes = await this.projectTypeRepository.getProjectTypes(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(
        projectTypes,
        "ProjectTypes retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ProjectTypeService-getProjectTypes");
      res.sendError(error, "ProjectTypes retrieval failed");
    }
  }

  public async getProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectType = await this.projectTypeRepository.getProjectTypeById(
        req,
        id
      );
      res.sendFormatted(projectType, "ProjectType retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-getProjectType");
      res.sendError(error, "ProjectType retrieval failed");
    }
  }

  public async createProjectType(req: Request, res: Response) {
    try {
      const projectTypeData = req.body;
      const newProjectType = await this.projectTypeRepository.createProjectType(
        req,
        projectTypeData
      );
      res.sendFormatted(
        newProjectType,
        "ProjectType created successfully",
        201
      );
    } catch (error) {
      await logError(error, req, "ProjectTypeService-createProjectType");
      res.sendError(error, "ProjectType creation failed");
    }
  }

  public async updateProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectTypeData = req.body;
      const updatedProjectType =
        await this.projectTypeRepository.updateProjectType(
          req,
          id,
          projectTypeData
        );
      res.sendFormatted(updatedProjectType, "ProjectType updated successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-updateProjectType");
      res.sendError(error, "ProjectType update failed");
    }
  }

  public async deleteProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProjectType =
        await this.projectTypeRepository.deleteProjectType(req, id);
      res.sendFormatted(deletedProjectType, "ProjectType deleted successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-deleteProjectType");
      res.sendError(error, "ProjectType deletion failed");
    }
  }
}

export default ProjectTypeService;

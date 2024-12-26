// src/services/projectManager.ts

import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import ProjectManagerRepository from "../database/repositories/projectManager";
import { hashPassword } from "../utils/passwordUtils";

class ProjectManagerService {
  private projectManagerRepository: ProjectManagerRepository;

  constructor() {
    this.projectManagerRepository = new ProjectManagerRepository();
  }

  public async getProjectManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectManagers =
        await this.projectManagerRepository.getProjectManagers(
          req,
          pagination,
          search
        );
      res.sendArrayFormatted(
        projectManagers,
        "Customers retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ProjectManagerService-getProjectManagers");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async getProjectManagerById(req: Request, res: Response) {
    try {
      const projectManager =
        await this.projectManagerRepository.getProjectManagerById(
          req,
          req.params.id
        );
      res.json(projectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-getProjectManagerById");
      res.status(404).json({ error: error });
    }
  }

  public async createProjectManager(req: Request, res: Response) {
    try {
      // Hash password
      req.body.password = await hashPassword(req.body.password);
      const newProjectManager =
        await this.projectManagerRepository.createProjectManager(req, req.body);
      res.status(201).json(newProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-createProjectManager");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async updateProjectManager(req: Request, res: Response) {
    try {
      if (req.body.password) {
        req.body.password = await hashPassword(req.body.password);
      }

      const updatedProjectManager =
        await this.projectManagerRepository.updateProjectManager(
          req,
          req.params.id,
          req.body
        );
      res.json(updatedProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-updateProjectManager");
      res.status(404).json({ error: error });
    }
  }

  public async deleteProjectManager(req: Request, res: Response) {
    try {
      const deletedProjectManager =
        await this.projectManagerRepository.deleteProjectManager(
          req,
          req.params.id
        );
      res.json(deletedProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-deleteProjectManager");
      res.status(404).json({ error: error });
    }
  }
}

export default ProjectManagerService;

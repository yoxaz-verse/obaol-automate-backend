// src/services/manager.ts

import { Request, Response } from "express";
import ManagerRepository from "../database/repositories/manager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ManagerService {
  private managerRepository: ManagerRepository;

  constructor() {
    this.managerRepository = new ManagerRepository();
  }

  public async getManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const managers = await this.managerRepository.getManagers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(managers, "Managers retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-getManagers");
      res.sendError(error, "Managers retrieval failed", 500);
    }
  }

  public async getManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const manager = await this.managerRepository.getManagerById(req, id);

      if (!manager) {
        res.sendError("Manager not found", "Manager retrieval failed", 404);
        return;
      }

      res.sendFormatted(manager, "Manager retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-getManager");
      res.sendError(error, "Manager retrieval failed", 500);
    }
  }

  public async createManager(req: Request, res: Response) {
    try {
      const managerData = req.body;
      console.log(req.body);

      // Integrate fileId and fileURL received from another API
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        managerData.fileId = fileId;
        managerData.fileURL = fileURL;
      } else {
        res.sendError(
          "fileId and fileURL must be provided",
          "Invalid input data",
          400
        );
        return;
      }

      const newManager = await this.managerRepository.createManager(
        req,
        managerData
      );

      res.sendFormatted(newManager, "Manager created successfully", 201);
    } catch (error) {
      await logError(error, req, "ManagerService-createManager");
      res.sendError(error, "Manager creation failed", 500);
    }
  }

  public async updateManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const managerData = req.body;

      // Integrate fileId and fileURL received from another API, if provided
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        managerData.fileId = fileId;
        managerData.fileURL = fileURL;
      }

      const updatedManager = await this.managerRepository.updateManager(
        req,
        id,
        managerData
      );

      if (!updatedManager) {
        res.sendError(
          "Manager not found or no changes made",
          "Manager update failed",
          404
        );
        return;
      }

      res.sendFormatted(updatedManager, "Manager updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-updateManager");
      res.sendError(error, "Manager update failed", 500);
    }
  }

  public async deleteManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedManager = await this.managerRepository.deleteManager(
        req,
        id
      );

      if (!deletedManager) {
        res.sendError(
          "Manager not found or already deleted",
          "Manager deletion failed",
          404
        );
        return;
      }

      res.sendFormatted(deletedManager, "Manager deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-deleteManager");
      res.sendError(error, "Manager deletion failed", 500);
    }
  }
}

export default ManagerService;

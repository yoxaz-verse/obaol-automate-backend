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
      res.sendArrayFormatted(managers, "Managers retrieved successfully");
    } catch (error) {
      await logError(error, req, "ManagerService-getManagers");
      res.sendError(error, "Managers retrieval failed");
    }
  }

  public async getManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const manager = await this.managerRepository.getManagerById(req, id);
      res.sendFormatted(manager, "Manager retrieved successfully");
    } catch (error) {
      await logError(error, req, "ManagerService-getManager");
      res.sendError(error, "Manager retrieval failed");
    }
  }

  public async createManager(req: Request, res: Response) {
    try {
      const managerData = req.body;
      const newManager = await this.managerRepository.createManager(req, managerData);
      res.sendFormatted(newManager, "Manager created successfully", 201);
    } catch (error) {
      await logError(error, req, "ManagerService-createManager");
      res.sendError(error, "Manager creation failed");
    }
  }

  public async updateManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const managerData = req.body;
      const updatedManager = await this.managerRepository.updateManager(
        req,
        id,
        managerData
      );
      res.sendFormatted(updatedManager, "Manager updated successfully");
    } catch (error) {
      await logError(error, req, "ManagerService-updateManager");
      res.sendError(error, "Manager update failed");
    }
  }

  public async deleteManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedManager = await this.managerRepository.deleteManager(req, id);
      res.sendFormatted(deletedManager, "Manager deleted successfully");
    } catch (error) {
      await logError(error, req, "ManagerService-deleteManager");
      res.sendError(error, "Manager deletion failed");
    }
  }
}

export default ManagerService;

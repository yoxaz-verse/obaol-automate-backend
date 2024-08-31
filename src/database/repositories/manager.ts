import { Request } from "express";
import { ManagerModel } from "../models/manager";
import { IManager, ICreateManager, IUpdateManager } from "../../interfaces/manager";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ManagerRepository {
  public async getManagers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IManager[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const managers = await ManagerModel.find(query)
        .populate("admin")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: managers as IManager[],
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagers");
      throw error;
    }
  }

  public async getManagerById(req: Request, id: string): Promise<IManager> {
    try {
      const manager = await ManagerModel.findById(id)
        .populate("admin")
        .lean();
      if (!manager || manager.isDeleted) {
        throw new Error("Manager not found");
      }
      return manager as IManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagerById");
      throw error;
    }
  }

  public async createManager(
    req: Request,
    managerData: ICreateManager
  ): Promise<IManager> {
    try {
      const newManager = await ManagerModel.create(managerData);
      return newManager.toObject();
    } catch (error) {
      await logError(error, req, "ManagerRepository-createManager");
      throw error;
    }
  }

  public async updateManager(
    req: Request,
    id: string,
    managerData: Partial<IUpdateManager>
  ): Promise<IManager> {
    try {
      const updatedManager = await ManagerModel.findByIdAndUpdate(id, managerData, {
        new: true,
      }).populate("admin");
      if (!updatedManager || updatedManager.isDeleted) {
        throw new Error("Failed to update manager");
      }
      return updatedManager.toObject();
    } catch (error) {
      await logError(error, req, "ManagerRepository-updateManager");
      throw error;
    }
  }

  public async deleteManager(req: Request, id: string): Promise<IManager> {
    try {
      const deletedManager = await ManagerModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).populate("admin");
      if (!deletedManager) {
        throw new Error("Failed to delete manager");
      }
      return deletedManager.toObject();
    } catch (error) {
      await logError(error, req, "ManagerRepository-deleteManager");
      throw error;
    }
  }
}

export default ManagerRepository;

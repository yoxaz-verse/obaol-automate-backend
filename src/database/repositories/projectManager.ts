import { Request } from "express";
import { ManagerModel } from "../models/manager";
import { ICreateManager, IUpdateManager } from "../../interfaces/manager";
import { logError } from "../../utils/errorLogger";
import { IManager } from "../../interfaces/manager";
import { ProjectManagerModel } from "@database/models/Projectmanager";

class ProjectManagerRepository {
  public async getProjectManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ProjectManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const managers = await ProjectManagerModel.find(query)
        .populate("admin", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: managers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagers");
      throw error;
    }
  }

  public async getProjectManagerById(
    req: Request,
    id: string
  ): Promise<IManager> {
    try {
      const managerDoc = await ProjectManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "name");

      if (!managerDoc) {
        throw new Error("Manager not found");
      }

      return managerDoc;
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagerById");
      throw error;
    }
  }

  public async createProjectManager(
    req: Request,
    managerData: ICreateManager
  ): Promise<IManager> {
    try {
      const newManager = await ManagerModel.create(managerData);
      return newManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-createManager");
      throw error;
    }
  }

  public async updateProjectManager(
    req: Request,
    id: string,
    managerData: Partial<IUpdateManager>
  ): Promise<IManager> {
    try {
      const updatedManager = await ProjectManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        managerData,
        { new: true }
      ).populate("admin", "name");
      if (!updatedManager) {
        throw new Error("Failed to update manager");
      }
      return updatedManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-updateManager");
      throw error;
    }
  }

  public async deleteProjectManager(
    req: Request,
    id: string
  ): Promise<IManager> {
    try {
      const deletedManager = await ProjectManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "name");
      if (!deletedManager) {
        throw new Error("Failed to delete manager");
      }
      return deletedManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-deleteManager");
      throw error;
    }
  }
}

export default ProjectManagerRepository;

import { Request } from "express";
import { ProjectManagerModel } from "../models/projectManager";
import {
  ICreateProjectManager,
  IUpdateProjectManager,
} from "../../interfaces/projectManager";
import { logError } from "../../utils/errorLogger";
import { IProjectManager } from "../../interfaces/projectManager";

class ProjectManagerRepository {
  public async getProjectManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IProjectManager[];
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

      const projectManagers = await ProjectManagerModel.find(query)
        .populate("admin", "_id name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: projectManagers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ProjectManagerRepository-getProjectManagers");
      throw error;
    }
  }

  public async getProjectManagerById(
    req: Request,
    id: string
  ): Promise<IProjectManager> {
    try {
      const projectManagerDoc = await ProjectManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "_id name");

      if (!projectManagerDoc) {
        throw new Error("ProjectManager not found");
      }

      return projectManagerDoc;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectManagerRepository-getProjectManagerById"
      );
      throw error;
    }
  }

  public async createProjectManager(
    req: Request,
    projectManagerData: ICreateProjectManager
  ): Promise<IProjectManager> {
    try {
      const newProjectManager = await ProjectManagerModel.create(
        projectManagerData
      );
      return newProjectManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectManagerRepository-createProjectManager"
      );
      throw error;
    }
  }

  public async updateProjectManager(
    req: Request,
    id: string,
    projectManagerData: Partial<IUpdateProjectManager>
  ): Promise<IProjectManager> {
    try {
      const updatedProjectManager = await ProjectManagerModel.findOneAndUpdate(
        { _id: id },
        projectManagerData,
        {
          new: true,
        }
      ).populate("admin", "_id name");

      if (!updatedProjectManager) {
        throw new Error("Failed to update ProjectManager");
      }
      return updatedProjectManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectManagerRepository-updateProjectManager"
      );
      throw error;
    }
  }

  public async deleteProjectManager(
    req: Request,
    id: string
  ): Promise<IProjectManager> {
    try {
      const deletedProjectManager = await ProjectManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "_id name");
      if (!deletedProjectManager) {
        throw new Error("Failed to delete ProjectManager");
      }
      return deletedProjectManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectManagerRepository-deleteProjectManager"
      );
      throw error;
    }
  }
}

export default ProjectManagerRepository;

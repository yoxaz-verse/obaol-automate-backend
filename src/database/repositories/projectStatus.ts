// src/database/repositories/projectStatus.ts
import { Request } from "express";
import { ProjectStatusModel } from "../models/projectStatus";
import {
  IProjectStatus,
  ICreateProjectStatus,
  IUpdateProjectStatus,
} from "../../interfaces/projectStatus";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectStatusRepository {
  public async getProjectStatuses(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProjectStatus[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const projectStatuses = await ProjectStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IProjectStatus[]>();

      const totalCount = await ProjectStatusModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: projectStatuses,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-getProjectStatuses");
      throw error;
    }
  }

  public async getProjectStatusById(
    req: Request,
    id: string
  ): Promise<IProjectStatus> {
    try {
      const projectStatus = await ProjectStatusModel.findById(
        id
      ).lean<IProjectStatus>();
      if (!projectStatus) {
        throw new Error("ProjectStatus not found");
      }
      return projectStatus;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectStatusRepository-getProjectStatusById"
      );
      throw error;
    }
  }

  public async createProjectStatus(
    req: Request,
    projectStatusData: ICreateProjectStatus
  ): Promise<IProjectStatus> {
    try {
      const newProjectStatus = await ProjectStatusModel.create(
        projectStatusData
      );
      return newProjectStatus.toObject() as IProjectStatus;
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-createProjectStatus");
      throw error;
    }
  }

  public async updateProjectStatus(
    req: Request,
    id: string,
    projectStatusData: Partial<IUpdateProjectStatus>
  ): Promise<IProjectStatus> {
    try {
      const updatedProjectStatus = await ProjectStatusModel.findByIdAndUpdate(
        id,
        projectStatusData,
        {
          new: true,
        }
      ).lean<IProjectStatus>();
      if (!updatedProjectStatus) {
        throw new Error("Failed to update project status");
      }
      return updatedProjectStatus;
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-updateProjectStatus");
      throw error;
    }
  }

  public async deleteProjectStatus(
    req: Request,
    id: string
  ): Promise<IProjectStatus> {
    try {
      const deletedProjectStatus = await ProjectStatusModel.findByIdAndDelete(
        id
      ).lean<IProjectStatus>();
      if (!deletedProjectStatus) {
        throw new Error("Failed to delete project status");
      }
      return deletedProjectStatus;
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-deleteProjectStatus");
      throw error;
    }
  }
}

export default ProjectStatusRepository;

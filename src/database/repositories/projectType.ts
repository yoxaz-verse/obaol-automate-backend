import { Request } from "express";
import { ProjectTypeModel } from "../models/projectType";
import {
  IProjectType,
  ICreateProjectType,
  IUpdateProjectType,
} from "../../interfaces/projectType";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectTypeRepository {
  public async getProjectTypes(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProjectType[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const projectTypesDoc = await ProjectTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      console.log(projectTypesDoc);

      const projectTypes = projectTypesDoc.map(
        (doc) => doc.toObject() as IProjectType
      );

      const totalCount = await ProjectTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: projectTypes,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-getProjectTypes");
      throw error;
    }
  }

  public async getProjectTypeById(
    req: Request,
    id: string
  ): Promise<IProjectType> {
    try {
      const projectTypeDoc = await ProjectTypeModel.findById(id);

      if (!projectTypeDoc) {
        throw new Error("ProjectType not found");
      }

      return projectTypeDoc.toObject() as IProjectType;
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-getProjectTypeById");
      throw error;
    }
  }

  public async createProjectType(
    req: Request,
    projectTypeData: ICreateProjectType
  ): Promise<IProjectType> {
    try {
      const newProjectType = await ProjectTypeModel.create(projectTypeData);
      return newProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-createProjectType");
      throw error;
    }
  }

  public async updateProjectType(
    req: Request,
    id: string,
    projectTypeData: Partial<IUpdateProjectType>
  ): Promise<IProjectType> {
    try {
      const updatedProjectType = await ProjectTypeModel.findByIdAndUpdate(
        id,
        projectTypeData,
        { new: true }
      );
      if (!updatedProjectType) {
        throw new Error("Failed to update ProjectType");
      }
      return updatedProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-updateProjectType");
      throw error;
    }
  }

  public async deleteProjectType(
    req: Request,
    id: string
  ): Promise<IProjectType> {
    try {
      const deletedProjectType = await ProjectTypeModel.findByIdAndDelete(id);
      if (!deletedProjectType) {
        throw new Error("Failed to delete ProjectType");
      }
      return deletedProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-deleteProjectType");
      throw error;
    }
  }
}

export default ProjectTypeRepository;

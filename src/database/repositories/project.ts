import { Request } from "express";
import { ProjectModel } from "../models/project";
import { logError } from "../../utils/errorLogger";
import { IProject } from "@interfaces/project";

class ProjectRepository {
  public async getProjects(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ) {
    try {
      const query: any = { isDeleted: false };
      if (search) query.title = { $regex: search, $options: "i" };

      const totalCount = await ProjectModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const projects = await ProjectModel.find(query)
        .populate("customer admin manager status type")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: projects, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjects");
      throw error;
    }
  }

  public async getProject(req: Request, id: string) {
    try {
      return await ProjectModel.findById(id)
        .populate("customer admin manager status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProject");
      throw error;
    }
  }

  public async createProject(req: Request, projectData: IProject) {
    try {
      console.log(projectData);
      const newProject = new ProjectModel(projectData);
      return await newProject.save();
    } catch (error) {
      await logError(error, req, "ProjectRepository-createProject");
      throw error;
    }
  }

  public async updateProject(req: Request, id: string, projectData: any) {
    try {
      return await ProjectModel.findByIdAndUpdate(id, projectData, {
        new: true,
      })
        .populate("customer admin manager status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProject");
      throw error;
    }
  }

  public async deleteProject(req: Request, id: string) {
    try {
      return await ProjectModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("customer admin manager status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-deleteProject");
      throw error;
    }
  }
}

export default ProjectRepository;

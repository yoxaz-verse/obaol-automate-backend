import { Request } from "express";
import { ProjectModel } from "../models/project";
import { IProject, ICreateProject, IUpdateProject } from "../../interfaces/project";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectRepository {
  public async getProjects(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProject[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      const projects = await ProjectModel.find(query)
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IProject[]>();

      const totalCount = await ProjectModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: projects,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjects");
      throw error;
    }
  }

  public async getProjectById(req: Request, id: string): Promise<IProject> {
    try {
      const project = await ProjectModel.findById(id)
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .lean<IProject>();
      if (!project || project.isDeleted) {
        throw new Error("Project not found");
      }
      return project;
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjectById");
      throw error;
    }
  }

  public async createProject(
    req: Request,
    projectData: ICreateProject
  ): Promise<IProject> {
    try {
      const newProject = await ProjectModel.create(projectData);
      return newProject.toObject() as IProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-createProject");
      throw error;
    }
  }

  public async updateProject(
    req: Request,
    id: string,
    projectData: IUpdateProject
  ): Promise<IProject> {
    try {
      const updatedProject = await ProjectModel.findByIdAndUpdate(id, projectData, {
        new: true,
      })
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .lean<IProject>();
      if (!updatedProject || updatedProject.isDeleted) {
        throw new Error("Failed to update project");
      }
      return updatedProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProject");
      throw error;
    }
  }

  public async deleteProject(req: Request, id: string): Promise<IProject> {
    try {
      const deletedProject = await ProjectModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .lean<IProject>();
      if (!deletedProject) {
        throw new Error("Failed to delete project");
      }
      return deletedProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-deleteProject");
      throw error;
    }
  }
}

export default ProjectRepository;

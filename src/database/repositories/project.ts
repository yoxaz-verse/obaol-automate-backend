import { Request } from "express";
import { ProjectModel } from "../models/project";
import {
  IProject,
  ICreateProject,
  IUpdateProject,
} from "../../interfaces/project";
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
        .lean();

      const mappedProjects = projects.map((project) => ({
        _id: project._id.toString(),
        title: project.title,
        description: project.description,
        customId: project.customId,
        customer: project.customer as any, // Handle as any or map the properties manually
        admin: project.admin as any, // Handle as any or map the properties manually
        manager: project.manager as any, // Handle as any or map the properties manually
        status: project.status as any, // Handle as any or map the properties manually
        statusHistory: project.statusHistory.map(
          (status: any) => status._id.toString() || status.toString()
        ), // Convert to string array
        isActive: project.isActive,
        isDeleted: project.isDeleted,
      })) as IProject[];

      const totalCount = await ProjectModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: mappedProjects,
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
        .lean();

      if (!project) {
        throw new Error("Project not found");
      }

      const mappedProject = {
        _id: project._id.toString(),
        title: project.title,
        description: project.description,
        customId: project.customId,
        customer: project.customer as any,
        admin: project.admin as any,
        manager: project.manager as any,
        status: project.status as any,
        statusHistory: project.statusHistory.map(
          (status: any) => status._id.toString() || status.toString()
        ), // Convert to string array
        isActive: project.isActive,
        isDeleted: project.isDeleted,
      };

      return mappedProject as IProject;
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
      return {
        _id: newProject._id.toString(),
        title: newProject.title,
        description: newProject.description,
        customId: newProject.customId,
        customer: newProject.customer as any,
        admin: newProject.admin as any,
        manager: newProject.manager as any,
        status: newProject.status as any,
        statusHistory: [], // Initially empty or map it correctly
        isActive: newProject.isActive,
        isDeleted: newProject.isDeleted,
      } as IProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-createProject");
      throw error;
    }
  }

  public async updateProject(
    req: Request,
    id: string,
    projectData: Partial<IUpdateProject>
  ): Promise<IProject> {
    try {
      const updatedProject = await ProjectModel.findByIdAndUpdate(
        id,
        projectData,
        {
          new: true,
        }
      )
        .populate("customer")
        .populate("admin")
        .populate("manager")
        .populate("status")
        .populate("statusHistory")
        .lean();

      if (!updatedProject) {
        throw new Error("Failed to update project");
      }

      const mappedUpdatedProject = {
        _id: updatedProject._id.toString(),
        title: updatedProject.title,
        description: updatedProject.description,
        customId: updatedProject.customId,
        customer: updatedProject.customer as any,
        admin: updatedProject.admin as any,
        manager: updatedProject.manager as any,
        status: updatedProject.status as any,
        statusHistory: updatedProject.statusHistory.map(
          (status: any) => status._id.toString() || status.toString()
        ), // Convert to string array
        isActive: updatedProject.isActive,
        isDeleted: updatedProject.isDeleted,
      };

      return mappedUpdatedProject as IProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProject");
      throw error;
    }
  }

  public async deleteProject(req: Request, id: string): Promise<IProject> {
    try {
      const deletedProject = await ProjectModel.findByIdAndDelete(id).lean();

      if (!deletedProject) {
        throw new Error("Failed to delete project");
      }

      const mappedDeletedProject = {
        _id: deletedProject._id.toString(),
        title: deletedProject.title,
        description: deletedProject.description,
        customId: deletedProject.customId,
        customer: deletedProject.customer as any,
        admin: deletedProject.admin as any,
        manager: deletedProject.manager as any,
        status: deletedProject.status as any,
        statusHistory: deletedProject.statusHistory.map(
          (status: any) => status._id.toString() || status.toString()
        ), // Convert to string array
        isActive: deletedProject.isActive,
        isDeleted: deletedProject.isDeleted,
      };

      return mappedDeletedProject as IProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-deleteProject");
      throw error;
    }
  }
}

export default ProjectRepository;

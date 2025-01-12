import { Request } from "express";
import { ProjectModel } from "../models/project";
import { logError } from "../../utils/errorLogger";
import { IProject } from "@interfaces/project";
import mongoose from "mongoose";

class ProjectRepository {
  public async getProjectCountByStatus(req: Request, query: any) {
    try {


      const countResult = await ProjectModel.aggregate([
        { $match: { ...query, isDeleted: false } }, // Apply filters and exclude deleted projects
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "projectstatuses", // Referencing the ProjectStatus collection
            localField: "_id",
            foreignField: "_id",
            as: "statusDetails",
          },
        },
        {
          $unwind: "$statusDetails",
        },
        {
          $project: {
            status: "$statusDetails.name",
            count: 1,
          },
        },
      ]);

      return countResult;
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjectCountByStatus");
      throw error;
    }
  }

  // GET all projects
  public async getProjects(
    req: Request,
    pagination: { page: number; limit: number },
    query: any
  ) {
    try {
      // Count total matching documents
      const totalCount = await ProjectModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;
      // Fetch projects with pagination and population
      const projects = await ProjectModel.find(query)
        .populate("status customer projectManager location type")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: projects, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjects");
      throw error;
    }
  }

  public async getProject(req: Request, query: any) {
    try {
      return await ProjectModel.findById(query)
        .populate("customer projectManager location status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProject");
      throw error;
    }
  }

  public async createProject(req: Request, projectData: any) {
    // try {
    //   console.log(projectData);
    //   console.log("Its on Repos");
    //   const newProject = new ProjectModel(projectData);
    //   console.log("Yo");
    //   return newProject;
    // } catch (error) {
    //   await logError(error, req, "ProjectRepository-createProject");
    //   throw error;
    // }
    try {
      console.log(projectData);

      const newProject = await ProjectModel.create(projectData);
      return newProject;
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
        .populate("customer projectManager location status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProject");
      throw error;
    }
  }
  public async updateProjectStatus(
    req: Request,
    projectId: string,
    newStatusId: any
  ) {
    try {
      const project = await ProjectModel.findById(projectId);
      if (!project) throw new Error("Project not found");

      // Update the project's status
      project.status = newStatusId;

      // Save the updated project
      const updatedProject = await project.save();

      // Trigger any side effects (e.g., notifications, dependent logic)
      console.log(`Project status updated to ${newStatusId} successfully`);

      return updatedProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProjectStatus");
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
        .populate("customer projectManager location status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-deleteProject");
      throw error;
    }
  }

  public async bulkInsertProjects(req: Request, projects: any[]) {
    const results = { success: [], failed: [] };

    for (const project of projects) {
      try {
        // Create a new project document
        const newProject = new ProjectModel(project);
        await newProject.save();

        results.success.push();
      } catch (error) {
        await logError(error, req, "ProjectRepository-bulkInsertProjects");
        results.failed.push();
      }
    }

    return results;
  }
}

export default ProjectRepository;

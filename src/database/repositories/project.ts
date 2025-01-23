import { Request } from "express";
import { ProjectModel } from "../models/project";
import { logError } from "../../utils/errorLogger";
import { IProject } from "@interfaces/project";
import mongoose from "mongoose";

class ProjectRepository {
  public async getProjectCountByStatus(req: Request, query: any) {
    try {
      // Ensure any _id fields in the query are properly cast to ObjectId
      if (query._id) {
        if (Array.isArray(query._id.$in)) {
          query._id.$in = query._id.$in.map(
            (id: any) => new mongoose.Types.ObjectId(id)
          );
        } else {
          query._id = new mongoose.Types.ObjectId(query._id);
        }
      }

      if (query.status) {
        query.status = new mongoose.Types.ObjectId(query.status);
      }

      // Aggregation pipeline
      const countResult = await ProjectModel.aggregate([
        { $match: { ...query, isDeleted: false } }, // Apply filters and exclude deleted projects
        {
          $group: {
            _id: "$status", // Group by the status field
            count: { $sum: 1 }, // Count the number of projects for each status
          },
        },
        {
          $lookup: {
            from: "projectstatuses", // Lookup the ProjectStatus collection
            localField: "_id", // _id from the previous group stage (status)
            foreignField: "_id", // Match with _id in the ProjectStatus collection
            as: "statusDetails", // Output the result as statusDetails
          },
        },
        { $unwind: "$statusDetails" }, // Flatten the statusDetails array
        {
          $project: {
            status: "$statusDetails.name", // Project the status name
            count: 1, // Include the count
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
        .populate({
          path: "location",
          populate: {
            path: "locationManagers.manager", // Path to populate locationManager names
            select: "name", // Include only the manager's name field
          },
        })
        .populate("status customer projectManager type") // Other population fields
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

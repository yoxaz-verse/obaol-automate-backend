import { Request } from "express";
import { ProjectModel } from "../models/project";
import { logError } from "../../utils/errorLogger";

class ProjectRepository {
  /**
   * Get project count grouped by status with dynamic filters.
   */
  public async getProjectCountByStatus(req: Request, query: any) {
    try {
      const countResult = await ProjectModel.aggregate([
        { $match: { ...query, isDeleted: false } }, // Apply dynamic filters
        {
          $group: {
            _id: "$status", // Group by `status` field
            count: { $sum: 1 }, // Count the number of documents for each status
          },
        },
        {
          $lookup: {
            from: "projectstatuses", // Reference the `ProjectStatus` collection
            localField: "_id", // Local `_id` field (status ID)
            foreignField: "_id", // Foreign `_id` field in `ProjectStatus`
            as: "statusDetails", // Name the result as `statusDetails`
          },
        },
        { $unwind: "$statusDetails" }, // Flatten the `statusDetails` array
        {
          $project: {
            status: "$statusDetails.name", // Extract the `name` field of `statusDetails`
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

  /**
   * Get all projects with dynamic query and pagination.
   */
  public async getProjects(
    req: Request,
    pagination: { page: number; limit: number },
    query: any
  ) {
    try {
      const totalCount = await ProjectModel.countDocuments(query); // Total results
      const totalPages = Math.ceil(totalCount / pagination.limit);
      console.log("query");
      console.log(query);

      const projects = await ProjectModel.find(query)
        .populate("status customer projectManager location") // Populate references
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);

      return {
        data: projects,
        totalCount,
        totalPages,
        currentPage: pagination.page,
      };
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

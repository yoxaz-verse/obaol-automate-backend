import { Request, Response } from "express";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";
import ProjectRepository from "../database/repositories/project";
import { ProjectStatusModel } from "../database/models/projectStatus";
import { buildProjectQuery } from "../utils/buildProjectQuery";
import { LocationModel } from "../database/models/location";
import { CustomerModel } from "../database/models/customer";
import { ProjectManagerModel } from "../database/models/projectManager";
import { ProjectTypeModel } from "../database/models/projectType";
import mongoose from "mongoose";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class ProjectService {
  private projectRepository = new ProjectRepository();

  /**
   * Get project count by status with dynamic filtering.
   */
  public async getProjectCountByStatus(req: Request, res: Response) {
    try {
      const filters = req.body || req.query; // Fetch dynamic filters from the request
      const query = buildDynamicQuery(filters); // Build dynamic query using filters

      console.log("Generated Query:", query);

      // Fetch the count by status
      const projectCount = await this.projectRepository.getProjectCountByStatus(
        req,
        query
      );
      res.sendFormatted(
        projectCount,
        "Activity counts by status retrieved successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "ProjectService-getProjectCountByStatus");
      res
        .status(500)
        .json({ message: "Failed to retrieve project count by status", error });
    }
  }

  /**
   * Get all projects with dynamic filtering and pagination.
   */
  public async getProjects(req: Request, res: Response) {
    try {
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;

      // Build dynamic query based on filters
      const query = buildDynamicQuery(filters);
      // Fetch projects from the repository
      const projects = await this.projectRepository.getProjects(
        req,
        pagination,
        query
      );

      // res.status(200).json({
      //   message: "Projects retrieved successfully",
      //   data: projects.data,
      //   totalCount: projects.totalCount,
      //   totalPages: projects.totalPages,
      //   currentPage: projects.currentPage,
      // });
      res.sendFormatted(projects, "Activities retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-getProjects");
      res.status(500).json({ message: "Failed to retrieve projects", error });
    }
  }

  /**
   * Get a specific project by ID.
   */
  public async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Build role-based query
      const roleBasedQuery = await buildProjectQuery(req);
      roleBasedQuery._id = id; // Include the specific project ID

      const project = await this.projectRepository.getProject(
        req,
        roleBasedQuery
      );
      if (!project) {
        res.sendError(null, "Project not found or not authorized", 404);
        return;
      }

      res.json(project);
    } catch (error) {
      await logError(error, req, "ProjectService-getProject");
      res.sendError(error, "Failed to retrieve project", 500);
    }
  }

  /**
   * Create a new project with an initial status of "Created".
   */
  public async createProject(req: Request, res: Response) {
    try {
      const projectData = req.body;

      // Fetch the "Created" status ID
      const createdStatus = await ProjectStatusModel.findOne({
        name: "Open",
      });
      if (!createdStatus) {
        res.sendError(null, "Initial status 'Created' not found", 400);
        return;
      }

      // Attach the "Created" status to the new project
      projectData.status = createdStatus._id;

      // Create the project
      const newProject = await this.projectRepository.createProject(
        req,
        projectData
      );

      res.sendFormatted(newProject, "Project created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectService-createProject");
      res.sendError(error, "Project creation failed", 500);
    }
  }

  /**
   * Update an existing project's data and handle status updates.
   */
  public async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectData = req.body;

      // Update the project data
      const updatedProject = await this.projectRepository.updateProject(
        req,
        id,
        projectData
      );

      // Handle special statuses if `status` is included in the payload
      if (projectData.status) {
        const specialStatuses = ["Suspended", "Blocked", "Closed"];
        const statusDetails = await ProjectStatusModel.findById(
          projectData.status
        );

        if (!statusDetails) {
          res.sendError(null, "Invalid status", 400);
          return;
        }

        if (specialStatuses.includes(statusDetails.name)) {
          // Additional logic can be added here for special status handling if required
          console.log(
            `Project ${id} updated to special status: ${statusDetails.name}`
          );
        }

        // Update the status of the project
        await this.projectRepository.updateProjectStatus(
          req,
          id,
          projectData.status
        );
      }

      res.sendFormatted(updatedProject, "Project updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-updateProject");
      res.sendError(error, "Project update failed", 500);
    }
  }

  /**
   * Delete a project by ID.
   */
  public async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProject = await this.projectRepository.deleteProject(
        req,
        id
      );
      res.sendFormatted(deletedProject, "Project deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-deleteProject");
      res.sendError(error, "Project deletion failed", 500);
    }
  }

  public async bulkCreateProjects(req: Request, res: Response) {
    try {
      const projects = req.body;

      if (!Array.isArray(projects) || projects.length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid or empty projects array" });
      }

      const createdStatus = await ProjectStatusModel.findOne({ name: "Open" });
      if (!createdStatus?._id) {
        return res
          .status(400)
          .json({ message: "Default status 'Open' not found" });
      }
      const defaultStatusId = createdStatus._id;

      const invalidRows: any[] = [];
      const validProjects: any[] = [];

      for (const [index, project] of projects.entries()) {
        const errors: string[] = [];

        // Validate references in the database
        const location = await LocationModel.findOne({
          customId: project.location,
        });
        const customer = await CustomerModel.findOne({
          name: project.customer,
        });
        const projectManager = await ProjectManagerModel.findOne({
          email: project.projectManager,
        });
        const projectType = await ProjectTypeModel.findOne({
          name: project.type,
        });

        if (!location) errors.push("Invalid location reference.");
        if (!customer) errors.push("Invalid customer reference.");
        if (!projectManager) errors.push("Invalid project manager reference.");
        if (!projectType) errors.push("Invalid project type reference.");

        // Validate dates
        if (!this.isValidDate(project.assignmentDate))
          errors.push("Invalid assignment date format.");
        if (!this.isValidDate(project.schedaRadioDate))
          errors.push("Invalid scheda radio date format.");

        if (errors.length > 0) {
          invalidRows.push({ row: index + 1, issues: errors });
          continue; // Skip the invalid row
        }

        // Transform and add the valid project to the array
        validProjects.push({
          ...project,
          location: location?._id,
          customer: customer?._id,
          projectManager: projectManager?._id,
          type: projectType?._id,
          status: project.status || defaultStatusId,
          isActive: project.isActive ?? true,
          isDeleted: project.isDeleted ?? false,
          assignmentDate: new Date(project.assignmentDate).toISOString(),
          schedaRadioDate: new Date(project.schedaRadioDate).toISOString(),
        });
      }

      // If there are invalid rows, return an error response
      if (invalidRows.length > 0) {
        return res.status(400).json({
          message: "Bulk upload failed. Invalid rows found.",
          invalidRows, // Send row details with error messages
        });
      }

      // Bulk insert valid projects into the database
      const results = await this.projectRepository.bulkInsertProjects(
        req,
        validProjects
      );
      res.sendFormatted(results, "Bulk upload completed successfully", 201);
    } catch (error) {
      // Log the error and send a formatted response
      await logError(error, req, "ProjectService-bulkCreateProjects");
      res.sendError(error, "Bulk upload failed", 500);
    }
  }

  // Helper method to validate date
  private isValidDate(date: string): boolean {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }
}

export default ProjectService;

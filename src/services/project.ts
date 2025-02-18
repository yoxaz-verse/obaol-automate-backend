import { Request, Response } from "express";
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
import StatusHistoryService from "./statusHistory";
import { convertChangedFields } from "../utils/formatChangedFields";
import { AdminModel } from "../database/models/admin";
import { ManagerModel } from "../database/models/manager";

class ProjectService {
  private projectRepository = new ProjectRepository();
  private statusHistoryService = new StatusHistoryService();
  // Define the field-to-model mapping for Project
  projectFieldModelMapping = {
    customer: CustomerModel,
    admin: AdminModel,
    manager: ManagerModel,
    status: ProjectStatusModel,
    type: ProjectTypeModel,
    location: LocationModel,
    projectManager: ProjectManagerModel,
    // Add other fields and their corresponding models as needed
  };

  /**
   * Get project count by status with dynamic filtering.
   */
  public async getProjectCountByStatus(req: Request, res: Response) {
    try {
      const filters = req.body || req.query; // Fetch dynamic filters from the request
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const dynamicQuery = buildDynamicQuery(filters); // Build dynamic query using filters
      // Apply role-based access control (RBAC)
      const roleQuery = await this.getRoleBasedFilters(userRole, userId);

      // Merge dynamic filters with role filters
      const finalQuery = { ...dynamicQuery, ...roleQuery };

      // Fetch the count by status
      const projectCount = await this.projectRepository.getProjectCountByStatus(
        req,
        finalQuery
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

      const userId = req.user?.id;
      const userRole = req.user?.role;
      const dynamicQuery = buildDynamicQuery(filters); // Build dynamic query using filters
      // Apply role-based access control (RBAC)

      const roleQuery = await this.getRoleBasedFilters(userRole, userId);
      // Merge dynamic filters with role filters
      /* The line `const finalQuery = { ...roleQuery, ...dynamicQuery };` is merging two objects `roleQuery`
and `dynamicQuery` into a single object `finalQuery`. */
      const finalQuery = { ...roleQuery, ...dynamicQuery };
      // Fetch projects from the repository
      const projects = await this.projectRepository.getProjects(
        req,
        pagination,
        finalQuery
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
   * Create a new project with an initial status.
   */
  public async createProject(req: Request, res: Response) {
    try {
      const projectData = req.body;

      const createdStatus = await ProjectStatusModel.findOne({ name: "Open" });
      if (!createdStatus) {
        return res.sendError(null, "Initial status 'Open' not found", 400);
      }
      projectData.status = createdStatus._id;

      const newProject = await this.projectRepository.createProject(
        req,
        projectData
      );

      if (!newProject._id) {
        throw new Error("Project creation failed, missing _id.");
      }

      const changedBy = req.user?.id ?? "Unknown User";
      // Replace IDs with names in changedFields
      const changedFields = await convertChangedFields(
        projectData,
        {},
        this.projectFieldModelMapping
      );

      const changedRole =
        (req.user?.role as
          | "Admin"
          | "ProjectManager"
          | "ActivityManager"
          | "Worker") ?? "Worker";

      await this.statusHistoryService.logStatusChange(
        newProject._id.toString(),
        "Project",
        changedBy,
        changedRole,
        null,
        "Created",
        changedFields,
        "Created"
      );

      res.sendFormatted(newProject, "Project created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectService-createProject");
      res.sendError(error, "Project creation failed", 500);
    }
  }

  /**
   * Update an existing project and log status history.
   */
  public async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectData = req.body;

      // Fetch the previous project data
      const previousProject = await this.projectRepository.getProject(req, id);
      if (!previousProject || !previousProject._id) {
        return res.sendError(null, "Project not found", 404);
      }

      // Detect changed fields and replace IDs with names
      const changedFields = await convertChangedFields(
        previousProject,
        projectData,
        this.projectFieldModelMapping
      );

      // Update the project
      const updatedProject = await this.projectRepository.updateProject(
        req,
        id,
        projectData
      );

      // Ensure the update was successful
      if (!updatedProject || !updatedProject._id) {
        return res.sendError(null, "Project update failed", 500);
      }

      const changedBy = req.user?.id ?? "Unknown User";
      const changedRole =
        (req.user?.role as
          | "Admin"
          | "ProjectManager"
          | "ActivityManager"
          | "Worker") ?? "Worker";

      // Log all changes in status history
      await this.statusHistoryService.logStatusChange(
        updatedProject._id.toString(),
        "Project",
        changedBy,
        changedRole,
        null, // No previous status field, capturing all field changes
        "Updated", // No new status field, as we're tracking all changes
        changedFields, // Log all changed variables here
        "Updated"
      );

      res.sendFormatted(updatedProject, "Project updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-updateProject");
      res.sendError(error, "Project update failed", 500);
    }
  }

  /**
   * Delete a project and log its deletion.
   */
  public async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Fetch the project before deletion
      const deletedProject = await this.projectRepository.deleteProject(
        req,
        id
      );
      if (!deletedProject || !deletedProject._id) {
        return res.sendError(null, "Project deletion failed", 500);
      }

      const changedBy = req.user?.id ?? "Unknown User";
      const changedRole =
        (req.user?.role as
          | "Admin"
          | "ProjectManager"
          | "ActivityManager"
          | "Worker") ?? "Worker";

      // Ensure status is properly converted
      const previousStatus = deletedProject.status
        ? deletedProject.status.toString()
        : "Unknown";

      // Log deletion
      await this.statusHistoryService.logStatusChange(
        deletedProject._id.toString(),
        "Project",
        changedBy,
        changedRole,
        previousStatus,
        "Deleted",
        [],
        "Deleted"
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

  /**
   * Apply role-based filtering for projects.
   */
  private async getRoleBasedFilters(
    userRole: string | undefined,
    userId: string | undefined
  ): Promise<Record<string, any>> {
    if (!userRole || !userId) {
      throw new Error("User role or ID is missing.");
    }

    const filters: any = { isDeleted: false };

    switch (userRole) {
      case "Admin":
        return filters; // Admin has access to all projects

      case "ProjectManager":
        return { projectManager: new mongoose.Types.ObjectId(userId) };

      case "Customer":
        return { customer: new mongoose.Types.ObjectId(userId) };

      case "ActivityManager": {
        const projects =
          await this.projectRepository.getProjectsManagedByActivityManager(
            userId
          );
        return projects.length
          ? { _id: { $in: projects } }
          : { _id: { $in: [] } }; // Prevent errors
      }

      case "Worker": {
        const projects = await this.projectRepository.getProjectsForWorker(
          userId
        );
        return projects.length
          ? { _id: { $in: projects } }
          : { _id: { $in: [] } }; // Prevent errors
      }

      default:
        throw new Error("Access denied: Invalid role.");
    }
  }
}

export default ProjectService;

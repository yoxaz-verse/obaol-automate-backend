import { Request, Response } from "express";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";
import ProjectRepository from "../database/repositories/project";
import { ProjectStatusModel } from "../database/models/projectStatus";
import { buildProjectQuery } from "../utils/buildProjectQuery";

class ProjectService {
  private projectRepository = new ProjectRepository();

  /**
   * Get all projects with pagination and search.
   */
  public async getProjects(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);

      // Build the role-based query
      const roleBasedQuery = await buildProjectQuery(req);

      // Add search and additional filters
      if (search) roleBasedQuery.title = { $regex: search, $options: "i" };
      if (req.query.status) roleBasedQuery.status = req.query.status;
      if (req.query.location) roleBasedQuery.location = req.query.location;

      // Pass the status to the repository function
      const projects = await this.projectRepository.getProjects(
        req,
        pagination,
        roleBasedQuery
      );

      res.sendFormatted(projects, "Projects retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-getProjects");
      res.sendError(error, "Failed to retrieve projects", 500);
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
      const projects = req.body; // Assuming an array of projects is sent in the request body
      console.log("1");

      // Validate input format
      if (!Array.isArray(projects) || projects.length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid or empty projects array" });
      }

      // Fetch default status "Open"
      const createdStatus = await ProjectStatusModel.findOne({
        name: "Open",
      });
      const defaultStatusId = createdStatus?._id;
      console.log("2");

      if (!createdStatus || !defaultStatusId) {
        return res
          .status(400)
          .json({ message: "Initial status 'Open' not found" });
      }

      // Function to validate date fields
      const isValidDate = (date: string): boolean => {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime()); // Returns true if valid date
      };

      // Create an array to hold rows that have issues
      let invalidRows: any[] = [];
      console.log("3");

      // Loop through each project to validate date fields and other necessary fields
      const formattedProjects = projects.map((project: any, index: number) => {
        // Validate dates
        if (
          !isValidDate(project.assignmentDate) ||
          !isValidDate(project.schedaRadioDate)
        ) {
          invalidRows.push({ row: index + 1, issue: "Invalid date" });
          return null; // Return null for rows with invalid dates
        }

        // Convert to proper date format (ISO string or any other format you prefer)
        project.assignmentDate = new Date(project.assignmentDate).toISOString();
        project.schedaRadioDate = new Date(
          project.schedaRadioDate
        ).toISOString();

        // Add default status to the project
        project.status = defaultStatusId;

        return project;
      });
      console.log("4");

      // Check if any rows had issues
      if (invalidRows.length > 0) {
        return res.status(400).json({
          message: "Bulk upload failed. Invalid rows found.",
          invalidRows,
        });
      }
      console.log("5");

      // Remove null entries from formattedProjects (invalid rows)
      const validProjects = formattedProjects.filter(
        (project) => project !== null
      );
      console.log("6");
      console.log(validProjects);

      // Proceed with bulk insert for valid projects
      const results = await this.projectRepository.bulkInsertProjects(
        req,
        validProjects,
        defaultStatusId
      );

      // Send successful response
      res.sendFormatted(results, "Bulk upload completed", 201);
    } catch (error) {
      await logError(error, req, "ProjectService-bulkCreateProjects");
      res.sendError(error, "Bulk upload failed", 500);
    }
  }
}

export default ProjectService;

import { Request, Response, NextFunction } from "express";
import Joi from "joi";

class ProjectMiddleware {
  public validateCreate(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      description: Joi.string().optional(),
      customer: Joi.string().required(),
      location: Joi.string().required(),
      projectManager: Joi.string().required(),
      type: Joi.string().required(),
      task: Joi.string().optional(),
      orderNumber: Joi.string().optional(),
      assignmentDate: Joi.date().required(),
      schedaRadioDate: Joi.date().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }
  public async validateBulkCreate(req: Request, res: Response, next: Function) {
    const projects = req.body;

    if (!Array.isArray(projects) || projects.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty projects array" });
    }

    const invalidRows: any[] = [];

    projects.forEach((project: any, index: number) => {
      const errors: string[] = [];

      // Check for required fields and add error messages if missing or invalid
      if (!project.location) errors.push("Location is missing.");
      if (!project.customer) errors.push("Customer is missing.");
      if (!project.projectManager) errors.push("Project manager is missing.");
      if (!project.type) errors.push("Project type is missing.");

      // Validate dates
      if (
        !project.assignmentDate ||
        isNaN(new Date(project.assignmentDate).getTime())
      ) {
        errors.push(
          "Invalid or missing assignment date. Expected format: YYYY-MM-DD."
        );
      }
      if (
        !project.schedaRadioDate ||
        isNaN(new Date(project.schedaRadioDate).getTime())
      ) {
        errors.push(
          "Invalid or missing scheda radio date. Expected format: YYYY-MM-DD."
        );
      }

      // Validate other fields (task, orderNumber, etc.)
      if (!project.task) errors.push("Task is missing.");
      if (!project.orderNumber) errors.push("Order number is missing.");

      // If there are errors for the current row, add them to the invalidRows array
      if (errors.length > 0) {
        invalidRows.push({ row: index + 1, issues: errors });
      }
    });

    if (invalidRows.length > 0) {
      return res.status(400).json({
        message: "Bulk validation failed. Invalid rows found.",
        invalidRows, // Send details about the rows that have errors
      });
    }

    next(); // Proceed to the next middleware if no validation errors
  }

  public validateGet(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }

  public validateUpdate(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      _id: Joi.string().optional(),
      title: Joi.string().optional(),
      description: Joi.string().optional(),
      customId: Joi.string().optional(),
      prevCustomId: Joi.string().optional(),
      customer: Joi.string().optional(),
      admin: Joi.string().optional(),
      location: Joi.string().optional(),
      projectManager: Joi.string().optional(),
      status: Joi.string().optional(),
      type: Joi.string().optional(),
      task: Joi.string().optional(),
      orderNumber: Joi.string().optional(),
      assignmentDate: Joi.date().optional(),
      schedaRadioDate: Joi.date().optional(),
      statusHistory: Joi.array().items(Joi.string()).optional(),
      isActive: Joi.boolean().optional(),
      isDeleted: Joi.boolean().optional(),
      updatedAt: Joi.date().optional(),
      createdAt: Joi.date().optional(),
      __v: Joi.date().optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }

  public validateDelete(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }
}

export default ProjectMiddleware;

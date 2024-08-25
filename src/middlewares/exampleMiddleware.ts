import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ExampleMiddleware {
  constructor() {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      if (!name || !description) {
        res.sendError(
          "ValidationError: Name and description are required", // Technical error details
          "Missing required fields: name and description", // User-friendly message
          400
        );
        return;
      }
      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ExampleCreate");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }
  // update
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const { id } = req.params;
      // check if id is provided
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided", // Technical error details
          "ID must be provided", // User-friendly message
          400
        );
        return;
      }
      //  either name or description must be provided
      if (!name && !description) {
        res.sendError(
          "ValidationError: Name or description must be provided", // Technical error details
          "Name or description must be provided", // User-friendly message
          400
        );
        return;
      }

      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ExampleUpdate");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }
  // delete
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided", // Technical error details
          "ID must be provided", // User-friendly message
          400
        );
        return;
      }
      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ExampleDelete");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }
}

export default ExampleMiddleware;


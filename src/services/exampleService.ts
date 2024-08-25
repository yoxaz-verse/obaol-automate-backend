import { Request, Response } from "express";
import ExampleRepository from "../database/repositories/exampleRepository";
import { IExampleInterface } from "../interfaces/exampleInterface";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";

class ExampleService {
  private exampleRepository: ExampleRepository;

  constructor() {
    this.exampleRepository = new ExampleRepository();
  }

  public async getExamples(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const examples = await this.exampleRepository.getExamples(
        req,
        pagination
      );
      res.sendFormatted(examples, "Examples retrieved successfully");
    } catch (error) {
      await logError(error, req, "Service-getExamples");
      res.sendError(error, "Example retrieval failed");
    }
  }

  public async createExample(req: Request, res: Response) {
    try {
      const example: IExampleInterface = req.body;
      const newExample = await this.exampleRepository.createExample(
        req,
        example
      );
      res.sendFormatted(newExample, "Example created successfully");
    } catch (error) {
      await logError(error, req, "Service-createExample");
      res.sendError(error, "Example creation failed");
    }
  }

  public async updateExample(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const example: Partial<IExampleInterface> = req.body;
      const updatedExample = await this.exampleRepository.updateExample(
        req,
        id,
        example
      );
      if (!updatedExample) {
        res.sendError(null, "Example not found", 404);
        return;
      }
      res.sendFormatted(updatedExample, "Example updated successfully");
    } catch (error) {
      await logError(error, req, "Service-updateExample");
      res.sendError(error, "Example update failed");
    }
  }

  public async deleteExample(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedExample = await this.exampleRepository.deleteExample(
        req,
        id
      );
      if (!deletedExample) {
        res.sendError(null, "Example not found", 404);
        return;
      }
      res.sendFormatted(null, "Example deleted successfully");
    } catch (error) {
      await logError(error, req, "Service-deleteExample");
      res.sendError(error, "Example deletion failed");
    }
  }

  public async findExampleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const example = await this.exampleRepository.findExampleById(req, id);
      if (!example) {
        res.sendError(null, "Example not found", 404);
        return;
      }
      res.sendFormatted(example, "Example retrieved successfully");
    } catch (error) {
      await logError(error, req, "Service-findExampleById");
      res.sendError(error, "Example retrieval failed");
    }
  }
}

export default ExampleService;


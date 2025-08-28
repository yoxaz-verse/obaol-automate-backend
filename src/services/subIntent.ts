import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import SubIntentRepository from "../database/repositories/subIntent";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class SubIntentService {
  private subIntentRepository: SubIntentRepository;

  constructor() {
    this.subIntentRepository = new SubIntentRepository();
  }

  public async getSubIntents(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.subIntentRepository.getSubIntents(req, pagination, dynamicQuery);
      res.json({
        message: "SubIntents retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "SubIntentService-getSubIntents");
      res.status(500).send("SubIntents retrieval failed");
    }
  }

  public async getSubIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.subIntentRepository.getSubIntentById(req, id);
      if (item) res.json(item);
      else res.status(404).send("SubIntent not found");
    } catch (error) {
      logError(error, req, "SubIntentService-getSubIntent");
      res.status(500).send("Error retrieving subIntent");
    }
  }

  public async createSubIntent(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.subIntentRepository.createSubIntent(req, data);
      res.status(201).json({ data: created, message: "SubIntent created successfully" });
    } catch (error) {
      logError(error, req, "SubIntentService-createSubIntent");
      res.status(500).send("SubIntent creation failed");
    }
  }

  public async updateSubIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.subIntentRepository.updateSubIntent(req, id, data);
      if (updated) res.json({ data: updated, message: "SubIntent updated successfully" });
      else res.status(404).send("SubIntent not found");
    } catch (error) {
      logError(error, req, "SubIntentService-updateSubIntent");
      res.status(500).send("SubIntent update failed");
    }
  }

  public async deleteSubIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.subIntentRepository.deleteSubIntent(req, id);
      if (deleted) res.json({ data: deleted, message: "SubIntent deleted successfully" });
      else res.status(404).send("SubIntent not found");
    } catch (error) {
      logError(error, req, "SubIntentService-deleteSubIntent");
      res.status(500).send("SubIntent deletion failed");
    }
  }
}

export default SubIntentService;

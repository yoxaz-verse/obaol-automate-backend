import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import GeneralIntentRepository from "../database/repositories/generalIntent";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class GeneralIntentService {
  private generalIntentRepository: GeneralIntentRepository;

  constructor() {
    this.generalIntentRepository = new GeneralIntentRepository();
  }

  public async getGeneralIntents(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.generalIntentRepository.getGeneralIntents(req, pagination, dynamicQuery);
      res.json({
        message: "GeneralIntents retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "GeneralIntentService-getGeneralIntents");
      res.status(500).send("GeneralIntents retrieval failed");
    }
  }

  public async getGeneralIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.generalIntentRepository.getGeneralIntentById(req, id);
      if (item) res.json(item);
      else res.status(404).send("GeneralIntent not found");
    } catch (error) {
      logError(error, req, "GeneralIntentService-getGeneralIntent");
      res.status(500).send("Error retrieving generalIntent");
    }
  }

  public async createGeneralIntent(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.generalIntentRepository.createGeneralIntent(req, data);
      res.status(201).json({ data: created, message: "GeneralIntent created successfully" });
    } catch (error) {
      logError(error, req, "GeneralIntentService-createGeneralIntent");
      res.status(500).send("GeneralIntent creation failed");
    }
  }

  public async updateGeneralIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.generalIntentRepository.updateGeneralIntent(req, id, data);
      if (updated) res.json({ data: updated, message: "GeneralIntent updated successfully" });
      else res.status(404).send("GeneralIntent not found");
    } catch (error) {
      logError(error, req, "GeneralIntentService-updateGeneralIntent");
      res.status(500).send("GeneralIntent update failed");
    }
  }

  public async deleteGeneralIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.generalIntentRepository.deleteGeneralIntent(req, id);
      if (deleted) res.json({ data: deleted, message: "GeneralIntent deleted successfully" });
      else res.status(404).send("GeneralIntent not found");
    } catch (error) {
      logError(error, req, "GeneralIntentService-deleteGeneralIntent");
      res.status(500).send("GeneralIntent deletion failed");
    }
  }
}

export default GeneralIntentService;

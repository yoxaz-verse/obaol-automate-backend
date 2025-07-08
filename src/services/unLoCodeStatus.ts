import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import UnLoCodeStatusRepository from "../database/repositories/unLoCodeStatus";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class UnLoCodeStatusService {
  private unLoCodeStatusRepository: UnLoCodeStatusRepository;

  constructor() {
    this.unLoCodeStatusRepository = new UnLoCodeStatusRepository();
  }

  public async getUnLoCodeStatuss(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.unLoCodeStatusRepository.getUnLoCodeStatuss(req, pagination, dynamicQuery);
      res.json({
        message: "UnLoCodeStatuss retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "UnLoCodeStatusService-getUnLoCodeStatuss");
      res.status(500).send("UnLoCodeStatuss retrieval failed");
    }
  }

  public async getUnLoCodeStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.unLoCodeStatusRepository.getUnLoCodeStatusById(req, id);
      if (item) res.json(item);
      else res.status(404).send("UnLoCodeStatus not found");
    } catch (error) {
      logError(error, req, "UnLoCodeStatusService-getUnLoCodeStatus");
      res.status(500).send("Error retrieving unLoCodeStatus");
    }
  }

  public async createUnLoCodeStatus(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.unLoCodeStatusRepository.createUnLoCodeStatus(req, data);
      res.status(201).json({ data: created, message: "UnLoCodeStatus created successfully" });
    } catch (error) {
      logError(error, req, "UnLoCodeStatusService-createUnLoCodeStatus");
      res.status(500).send("UnLoCodeStatus creation failed");
    }
  }

  public async updateUnLoCodeStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.unLoCodeStatusRepository.updateUnLoCodeStatus(req, id, data);
      if (updated) res.json({ data: updated, message: "UnLoCodeStatus updated successfully" });
      else res.status(404).send("UnLoCodeStatus not found");
    } catch (error) {
      logError(error, req, "UnLoCodeStatusService-updateUnLoCodeStatus");
      res.status(500).send("UnLoCodeStatus update failed");
    }
  }

  public async deleteUnLoCodeStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.unLoCodeStatusRepository.deleteUnLoCodeStatus(req, id);
      if (deleted) res.json({ data: deleted, message: "UnLoCodeStatus deleted successfully" });
      else res.status(404).send("UnLoCodeStatus not found");
    } catch (error) {
      logError(error, req, "UnLoCodeStatusService-deleteUnLoCodeStatus");
      res.status(500).send("UnLoCodeStatus deletion failed");
    }
  }
}

export default UnLoCodeStatusService;

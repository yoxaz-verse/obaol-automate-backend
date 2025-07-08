import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import UnLoCodeRepository from "../database/repositories/unLoCode";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class UnLoCodeService {
  private unLoCodeRepository: UnLoCodeRepository;

  constructor() {
    this.unLoCodeRepository = new UnLoCodeRepository();
  }

  public async getUnLoCodes(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.unLoCodeRepository.getUnLoCodes(req, pagination, dynamicQuery);
      res.json({
        message: "UnLoCodes retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "UnLoCodeService-getUnLoCodes");
      res.status(500).send("UnLoCodes retrieval failed");
    }
  }

  public async getUnLoCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.unLoCodeRepository.getUnLoCodeById(req, id);
      if (item) res.json(item);
      else res.status(404).send("UnLoCode not found");
    } catch (error) {
      logError(error, req, "UnLoCodeService-getUnLoCode");
      res.status(500).send("Error retrieving unLoCode");
    }
  }

  public async createUnLoCode(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.unLoCodeRepository.createUnLoCode(req, data);
      res.status(201).json({ data: created, message: "UnLoCode created successfully" });
    } catch (error) {
      logError(error, req, "UnLoCodeService-createUnLoCode");
      res.status(500).send("UnLoCode creation failed");
    }
  }

  public async updateUnLoCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.unLoCodeRepository.updateUnLoCode(req, id, data);
      if (updated) res.json({ data: updated, message: "UnLoCode updated successfully" });
      else res.status(404).send("UnLoCode not found");
    } catch (error) {
      logError(error, req, "UnLoCodeService-updateUnLoCode");
      res.status(500).send("UnLoCode update failed");
    }
  }

  public async deleteUnLoCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.unLoCodeRepository.deleteUnLoCode(req, id);
      if (deleted) res.json({ data: deleted, message: "UnLoCode deleted successfully" });
      else res.status(404).send("UnLoCode not found");
    } catch (error) {
      logError(error, req, "UnLoCodeService-deleteUnLoCode");
      res.status(500).send("UnLoCode deletion failed");
    }
  }
}

export default UnLoCodeService;

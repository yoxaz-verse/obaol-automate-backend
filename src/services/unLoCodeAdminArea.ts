import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import UnLoCodeAdminAreaRepository from "../database/repositories/unLoCodeAdminArea";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class UnLoCodeAdminAreaService {
  private unLoCodeAdminAreaRepository: UnLoCodeAdminAreaRepository;

  constructor() {
    this.unLoCodeAdminAreaRepository = new UnLoCodeAdminAreaRepository();
  }

  public async getUnLoCodeAdminAreas(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.unLoCodeAdminAreaRepository.getUnLoCodeAdminAreas(req, pagination, dynamicQuery);
      res.json({
        message: "UnLoCodeAdminAreas retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaService-getUnLoCodeAdminAreas");
      res.status(500).send("UnLoCodeAdminAreas retrieval failed");
    }
  }

  public async getUnLoCodeAdminArea(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.unLoCodeAdminAreaRepository.getUnLoCodeAdminAreaById(req, id);
      if (item) res.json(item);
      else res.status(404).send("UnLoCodeAdminArea not found");
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaService-getUnLoCodeAdminArea");
      res.status(500).send("Error retrieving unLoCodeAdminArea");
    }
  }

  public async createUnLoCodeAdminArea(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.unLoCodeAdminAreaRepository.createUnLoCodeAdminArea(req, data);
      res.status(201).json({ data: created, message: "UnLoCodeAdminArea created successfully" });
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaService-createUnLoCodeAdminArea");
      res.status(500).send("UnLoCodeAdminArea creation failed");
    }
  }

  public async updateUnLoCodeAdminArea(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.unLoCodeAdminAreaRepository.updateUnLoCodeAdminArea(req, id, data);
      if (updated) res.json({ data: updated, message: "UnLoCodeAdminArea updated successfully" });
      else res.status(404).send("UnLoCodeAdminArea not found");
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaService-updateUnLoCodeAdminArea");
      res.status(500).send("UnLoCodeAdminArea update failed");
    }
  }

  public async deleteUnLoCodeAdminArea(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.unLoCodeAdminAreaRepository.deleteUnLoCodeAdminArea(req, id);
      if (deleted) res.json({ data: deleted, message: "UnLoCodeAdminArea deleted successfully" });
      else res.status(404).send("UnLoCodeAdminArea not found");
    } catch (error) {
      logError(error, req, "UnLoCodeAdminAreaService-deleteUnLoCodeAdminArea");
      res.status(500).send("UnLoCodeAdminArea deletion failed");
    }
  }
}

export default UnLoCodeAdminAreaService;

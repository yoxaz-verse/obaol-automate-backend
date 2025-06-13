import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import DivisionRepository from "../database/repositories/division";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class DivisionService {
  private divisionRepository: DivisionRepository;

  constructor() {
    this.divisionRepository = new DivisionRepository();
  }

  public async getDivisions(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.divisionRepository.getDivisions(req, pagination, dynamicQuery);
      res.status(200).json({
        message: "Divisions retrieved successfully",
        ...result
      });
    } catch (error) {
      logError(error, req, "DivisionService-getDivisions");
      res.status(500).send("Divisions retrieval failed");
    }
  }

  public async getDivision(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.divisionRepository.getDivisionById(req, id);
      if (item) res.json(item);
      else res.status(404).send("Division not found");
    } catch (error) {
      logError(error, req, "DivisionService-getDivision");
      res.status(500).send("Error retrieving division");
    }
  }

  public async createDivision(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.divisionRepository.createDivision(req, data);
      res.status(201).json({ data: created, message: "Division created successfully" });
    } catch (error) {
      logError(error, req, "DivisionService-createDivision");
      res.status(500).send("Division creation failed");
    }
  }

  public async updateDivision(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.divisionRepository.updateDivision(req, id, data);
      if (updated) res.json({ data: updated, message: "Division updated successfully" });
      else res.status(404).send("Division not found");
    } catch (error) {
      logError(error, req, "DivisionService-updateDivision");
      res.status(500).send("Division update failed");
    }
  }

  public async deleteDivision(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.divisionRepository.deleteDivision(req, id);
      if (deleted) res.json({ data: deleted, message: "Division deleted successfully" });
      else res.status(404).send("Division not found");
    } catch (error) {
      logError(error, req, "DivisionService-deleteDivision");
      res.status(500).send("Division deletion failed");
    }
  }
}

export default DivisionService;

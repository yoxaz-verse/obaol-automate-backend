import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import AbbreviationRepository from "../database/repositories/abbreviation";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class AbbreviationService {
  private abbreviationRepository: AbbreviationRepository;

  constructor() {
    this.abbreviationRepository = new AbbreviationRepository();
  }

  public async getAbbreviations(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.abbreviationRepository.getAbbreviations(req, pagination, dynamicQuery);
      res.status(200).json({
        message: "Abbreviations retrieved successfully",
        ...result
      });
    } catch (error) {
      logError(error, req, "AbbreviationService-getAbbreviations");
      res.status(500).send("Abbreviations retrieval failed");
    }
  }

  public async getAbbreviation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.abbreviationRepository.getAbbreviationById(req, id);
      if (item) res.json(item);
      else res.status(404).send("Abbreviation not found");
    } catch (error) {
      logError(error, req, "AbbreviationService-getAbbreviation");
      res.status(500).send("Error retrieving abbreviation");
    }
  }

  public async createAbbreviation(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.abbreviationRepository.createAbbreviation(req, data);
      res.status(201).json({ data: created, message: "Abbreviation created successfully" });
    } catch (error) {
      logError(error, req, "AbbreviationService-createAbbreviation");
      res.status(500).send("Abbreviation creation failed");
    }
  }

  public async updateAbbreviation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.abbreviationRepository.updateAbbreviation(req, id, data);
      if (updated) res.json({ data: updated, message: "Abbreviation updated successfully" });
      else res.status(404).send("Abbreviation not found");
    } catch (error) {
      logError(error, req, "AbbreviationService-updateAbbreviation");
      res.status(500).send("Abbreviation update failed");
    }
  }

  public async deleteAbbreviation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.abbreviationRepository.deleteAbbreviation(req, id);
      if (deleted) res.json({ data: deleted, message: "Abbreviation deleted successfully" });
      else res.status(404).send("Abbreviation not found");
    } catch (error) {
      logError(error, req, "AbbreviationService-deleteAbbreviation");
      res.status(500).send("Abbreviation deletion failed");
    }
  }
}

export default AbbreviationService;

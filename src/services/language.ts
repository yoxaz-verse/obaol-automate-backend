import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import LanguageRepository from "../database/repositories/language";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class LanguageService {
  private languageRepository: LanguageRepository;

  constructor() {
    this.languageRepository = new LanguageRepository();
  }

  public async getLanguages(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.languageRepository.getLanguages(req, pagination, dynamicQuery);
      res.json({
        message: "Languages retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "LanguageService-getLanguages");
      res.status(500).send("Languages retrieval failed");
    }
  }

  public async getLanguage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.languageRepository.getLanguageById(req, id);
      if (item) res.json(item);
      else res.status(404).send("Language not found");
    } catch (error) {
      logError(error, req, "LanguageService-getLanguage");
      res.status(500).send("Error retrieving language");
    }
  }

  public async createLanguage(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.languageRepository.createLanguage(req, data);
      res.status(201).json({ data: created, message: "Language created successfully" });
    } catch (error) {
      logError(error, req, "LanguageService-createLanguage");
      res.status(500).send("Language creation failed");
    }
  }

  public async updateLanguage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.languageRepository.updateLanguage(req, id, data);
      if (updated) res.json({ data: updated, message: "Language updated successfully" });
      else res.status(404).send("Language not found");
    } catch (error) {
      logError(error, req, "LanguageService-updateLanguage");
      res.status(500).send("Language update failed");
    }
  }

  public async deleteLanguage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.languageRepository.deleteLanguage(req, id);
      if (deleted) res.json({ data: deleted, message: "Language deleted successfully" });
      else res.status(404).send("Language not found");
    } catch (error) {
      logError(error, req, "LanguageService-deleteLanguage");
      res.status(500).send("Language deletion failed");
    }
  }
}

export default LanguageService;

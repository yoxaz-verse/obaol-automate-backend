import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import CountryRepository from "../database/repositories/country";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class CountryService {
  private countryRepository: CountryRepository;

  constructor() {
    this.countryRepository = new CountryRepository();
  }

  public async getCountrys(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.countryRepository.getCountrys(req, pagination, dynamicQuery);
      res.json({
        message: "Countrys retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "CountryService-getCountrys");
      res.status(500).send("Countrys retrieval failed");
    }
  }

  public async getCountry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.countryRepository.getCountryById(req, id);
      if (item) res.json(item);
      else res.status(404).send("Country not found");
    } catch (error) {
      logError(error, req, "CountryService-getCountry");
      res.status(500).send("Error retrieving country");
    }
  }

  public async createCountry(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.countryRepository.createCountry(req, data);
      res.status(201).json({ data: created, message: "Country created successfully" });
    } catch (error) {
      logError(error, req, "CountryService-createCountry");
      res.status(500).send("Country creation failed");
    }
  }

  public async updateCountry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.countryRepository.updateCountry(req, id, data);
      if (updated) res.json({ data: updated, message: "Country updated successfully" });
      else res.status(404).send("Country not found");
    } catch (error) {
      logError(error, req, "CountryService-updateCountry");
      res.status(500).send("Country update failed");
    }
  }

  public async deleteCountry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.countryRepository.deleteCountry(req, id);
      if (deleted) res.json({ data: deleted, message: "Country deleted successfully" });
      else res.status(404).send("Country not found");
    } catch (error) {
      logError(error, req, "CountryService-deleteCountry");
      res.status(500).send("Country deletion failed");
    }
  }
}

export default CountryService;

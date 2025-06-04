import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import CityRepository from "../database/repositories/city";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class CityService {
  private cityRepository: CityRepository;

  constructor() {
    this.cityRepository = new CityRepository();
  }

  public async getCitys(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.cityRepository.getCitys(req, pagination, dynamicQuery);
      res.status(200).json({
        message: "Citys retrieved successfully",
        ...result
      });
    } catch (error) {
      logError(error, req, "CityService-getCitys");
      res.status(500).send("Citys retrieval failed");
    }
  }

  public async getCity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.cityRepository.getCityById(req, id);
      if (item) res.json(item);
      else res.status(404).send("City not found");
    } catch (error) {
      logError(error, req, "CityService-getCity");
      res.status(500).send("Error retrieving city");
    }
  }

  public async createCity(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.cityRepository.createCity(req, data);
      res.status(201).json({ data: created, message: "City created successfully" });
    } catch (error) {
      logError(error, req, "CityService-createCity");
      res.status(500).send("City creation failed");
    }
  }

  public async updateCity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.cityRepository.updateCity(req, id, data);
      if (updated) res.json({ data: updated, message: "City updated successfully" });
      else res.status(404).send("City not found");
    } catch (error) {
      logError(error, req, "CityService-updateCity");
      res.status(500).send("City update failed");
    }
  }

  public async deleteCity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.cityRepository.deleteCity(req, id);
      if (deleted) res.json({ data: deleted, message: "City deleted successfully" });
      else res.status(404).send("City not found");
    } catch (error) {
      logError(error, req, "CityService-deleteCity");
      res.status(500).send("City deletion failed");
    }
  }
}

export default CityService;

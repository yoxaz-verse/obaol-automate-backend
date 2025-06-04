import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import DistrictRepository from "../database/repositories/district";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class DistrictService {
  private districtRepository: DistrictRepository;

  constructor() {
    this.districtRepository = new DistrictRepository();
  }

  public async getDistricts(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.districtRepository.getDistricts(req, pagination, dynamicQuery);
      res.status(200).json({
        message: "Districts retrieved successfully",
        ...result
      });
    } catch (error) {
      logError(error, req, "DistrictService-getDistricts");
      res.status(500).send("Districts retrieval failed");
    }
  }

  public async getDistrict(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.districtRepository.getDistrictById(req, id);
      if (item) res.json(item);
      else res.status(404).send("District not found");
    } catch (error) {
      logError(error, req, "DistrictService-getDistrict");
      res.status(500).send("Error retrieving district");
    }
  }

  public async createDistrict(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.districtRepository.createDistrict(req, data);
      res.status(201).json({ data: created, message: "District created successfully" });
    } catch (error) {
      logError(error, req, "DistrictService-createDistrict");
      res.status(500).send("District creation failed");
    }
  }

  public async updateDistrict(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.districtRepository.updateDistrict(req, id, data);
      if (updated) res.json({ data: updated, message: "District updated successfully" });
      else res.status(404).send("District not found");
    } catch (error) {
      logError(error, req, "DistrictService-updateDistrict");
      res.status(500).send("District update failed");
    }
  }

  public async deleteDistrict(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.districtRepository.deleteDistrict(req, id);
      if (deleted) res.json({ data: deleted, message: "District deleted successfully" });
      else res.status(404).send("District not found");
    } catch (error) {
      logError(error, req, "DistrictService-deleteDistrict");
      res.status(500).send("District deletion failed");
    }
  }
}

export default DistrictService;

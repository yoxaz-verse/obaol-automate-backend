import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import DesignationRepository from "../database/repositories/designation";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class DesignationService {
  private designationRepository: DesignationRepository;

  constructor() {
    this.designationRepository = new DesignationRepository();
  }

  public async getDesignations(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.designationRepository.getDesignations(
        req,
        pagination,
        dynamicQuery
      );
      res.json({
        message: "Designations retrieved successfully",
        data: result,
      });
    } catch (error) {
      logError(error, req, "DesignationService-getDesignations");
      res.status(500).send("Designations retrieval failed");
    }
  }

  public async getDesignation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.designationRepository.getDesignationById(req, id);
      if (item) res.json(item);
      else res.status(404).send("Designation not found");
    } catch (error) {
      logError(error, req, "DesignationService-getDesignation");
      res.status(500).send("Error retrieving designation");
    }
  }

  public async createDesignation(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.designationRepository.createDesignation(
        req,
        data
      );
      res
        .status(201)
        .json({ data: created, message: "Designation created successfully" });
    } catch (error) {
      logError(error, req, "DesignationService-createDesignation");
      res.status(500).send("Designation creation failed");
    }
  }

  public async updateDesignation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.designationRepository.updateDesignation(
        req,
        id,
        data
      );
      if (updated)
        res.json({
          data: updated,
          message: "Designation updated successfully",
        });
      else res.status(404).send("Designation not found");
    } catch (error) {
      logError(error, req, "DesignationService-updateDesignation");
      res.status(500).send("Designation update failed");
    }
  }

  public async deleteDesignation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.designationRepository.deleteDesignation(
        req,
        id
      );
      if (deleted)
        res.json({
          data: deleted,
          message: "Designation deleted successfully",
        });
      else res.status(404).send("Designation not found");
    } catch (error) {
      logError(error, req, "DesignationService-deleteDesignation");
      res.status(500).send("Designation deletion failed");
    }
  }
}

export default DesignationService;

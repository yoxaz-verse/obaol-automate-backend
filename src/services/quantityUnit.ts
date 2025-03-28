import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { IPagination } from "../interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import QuantityUnitRepository from "../database/repositories/quantityUnit";

class QuantityUnitService {
  private quantityUnitRepository: QuantityUnitRepository;

  constructor() {
    this.quantityUnitRepository = new QuantityUnitRepository();
  }

  public async getQuantityUnits(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters); // Build dynamic query using filters

      const quantityUnits = await this.quantityUnitRepository.getQuantityUnits(
        req,
        pagination,
        dynamicQuery
      );
      res.json({
        data: quantityUnits,
        message: "QuantityUnits retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "QuantityUnitService-getQuantityUnits");
      res.status(500).json({ error: "QuantityUnits retrieval failed" });
    }
  }

  public async getQuantityUnit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const quantityUnit =
        await this.quantityUnitRepository.getQuantityUnitById(req, id);
      if (!quantityUnit) {
        res.status(404).json({ error: "QuantityUnit not found" });
        return;
      }
      res.json({
        data: quantityUnit,
        message: "QuantityUnit retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "QuantityUnitService-getQuantityUnit");
      res.status(500).json({ error: "quantityUnit retrieval failed" });
    }
  }

  public async createQuantityUnit(req: Request, res: Response) {
    try {
      const quantityUnitData = req.body;
      const newQuantityUnit =
        await this.quantityUnitRepository.createQuantityUnit(
          req,
          quantityUnitData
        );
      res.status(201).json({
        data: newQuantityUnit,
        message: "QuantityUnit created successfully",
      });
    } catch (error) {
      logError(error, req, "QuantityUnitService-createQuantityUnit");
      res.status(500).json({ error: "QuantityUnit creation failed" });
    }
  }

  public async updateQuantityUnit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const quantityUnitData = req.body;
      const updatedQuantityUnit =
        await this.quantityUnitRepository.updateQuantityUnit(
          req,
          id,
          quantityUnitData
        );
      if (!updatedQuantityUnit) {
        res.status(404).json({ error: "QuantityUnit not found" });
        return;
      }
      res.json({
        data: updatedQuantityUnit,
        message: "QuantityUnit updated successfully",
      });
    } catch (error) {
      logError(error, req, "QuantityUnitService-updateQuantityUnit");
      res.status(500).json({ error: "QuantityUnit update failed" });
    }
  }

  public async deleteQuantityUnit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedQuantityUnit =
        await this.quantityUnitRepository.deleteQuantityUnit(req, id);
      if (!deletedQuantityUnit) {
        res
          .status(404)
          .json({ error: "QuantityUnit not found or already deleted" });
        return;
      }
      res.json({
        data: deletedQuantityUnit,
        message: "QuantityUnit deleted successfully",
      });
    } catch (error) {
      logError(error, req, "QuantityUnitService-deleteQuantityUnit");
      res.status(500).json({ error: "QuantityUnit deletion failed" });
    }
  }
}

export default QuantityUnitService;

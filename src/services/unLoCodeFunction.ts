import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import UnLoCodeFunctionRepository from "../database/repositories/unLoCodeFunction";

class UnLoCodeFunctionService {
  private unLoCodeFunctionRepository: UnLoCodeFunctionRepository;

  constructor() {
    this.unLoCodeFunctionRepository = new UnLoCodeFunctionRepository();
  }

  public async getUnLoCodeFunctions(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.unLoCodeFunctionRepository.getUnLoCodeFunctions(
        req,
        pagination,
        dynamicQuery
      );
      res.json({
        message: "UnLoCodeFunctions retrieved successfully",
        data: result,
      });
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionService-getUnLoCodeFunctions");
      res.status(500).send("UnLoCodeFunctions retrieval failed");
    }
  }

  public async getUnLoCodeFunction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item =
        await this.unLoCodeFunctionRepository.getUnLoCodeFunctionById(req, id);
      if (item) res.json(item);
      else res.status(404).send("UnLoCodeFunction not found");
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionService-getUnLoCodeFunction");
      res.status(500).send("Error retrieving unLoCodeFunction");
    }
  }

  public async createUnLoCodeFunction(req: Request, res: Response) {
    try {
      const data = req.body;
      const created =
        await this.unLoCodeFunctionRepository.createUnLoCodeFunction(req, data);
      res
        .status(201)
        .json({
          data: created,
          message: "UnLoCodeFunction created successfully",
        });
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionService-createUnLoCodeFunction");
      res.status(500).send("UnLoCodeFunction creation failed");
    }
  }

  public async updateUnLoCodeFunction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated =
        await this.unLoCodeFunctionRepository.updateUnLoCodeFunction(
          req,
          id,
          data
        );
      if (updated)
        res.json({
          data: updated,
          message: "UnLoCodeFunction updated successfully",
        });
      else res.status(404).send("UnLoCodeFunction not found");
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionService-updateUnLoCodeFunction");
      res.status(500).send("UnLoCodeFunction update failed");
    }
  }

  public async deleteUnLoCodeFunction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted =
        await this.unLoCodeFunctionRepository.deleteUnLoCodeFunction(req, id);
      if (deleted)
        res.json({
          data: deleted,
          message: "UnLoCodeFunction deleted successfully",
        });
      else res.status(404).send("UnLoCodeFunction not found");
    } catch (error) {
      logError(error, req, "UnLoCodeFunctionService-deleteUnLoCodeFunction");
      res.status(500).send("UnLoCodeFunction deletion failed");
    }
  }
}

export default UnLoCodeFunctionService;

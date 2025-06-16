import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import EnquiryProcessStatusRepository from "../database/repositories/enquiryProcessStatus";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class EnquiryProcessStatusService {
  private enquiryProcessStatusRepository: EnquiryProcessStatusRepository;

  constructor() {
    this.enquiryProcessStatusRepository = new EnquiryProcessStatusRepository();
  }

  public async getEnquiryProcessStatuss(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result =
        await this.enquiryProcessStatusRepository.getEnquiryProcessStatuss(
          req,
          pagination,
          dynamicQuery
        );
      res.json({
        message: "EnquiryProcessStatuss retrieved successfully",
        data: result,
      });
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusService-getEnquiryProcessStatuss"
      );
      res.status(500).send("EnquiryProcessStatuss retrieval failed");
    }
  }

  public async getEnquiryProcessStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item =
        await this.enquiryProcessStatusRepository.getEnquiryProcessStatusById(
          req,
          id
        );
      if (item) res.json(item);
      else res.status(404).send("EnquiryProcessStatus not found");
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusService-getEnquiryProcessStatus"
      );
      res.status(500).send("Error retrieving enquiryProcessStatus");
    }
  }

  public async createEnquiryProcessStatus(req: Request, res: Response) {
    try {
      const data = req.body;
      const created =
        await this.enquiryProcessStatusRepository.createEnquiryProcessStatus(
          req,
          data
        );
      res.status(201).json({
        data: created,
        message: "EnquiryProcessStatus created successfully",
      });
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusService-createEnquiryProcessStatus"
      );
      res.status(500).send("EnquiryProcessStatus creation failed");
    }
  }

  public async updateEnquiryProcessStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated =
        await this.enquiryProcessStatusRepository.updateEnquiryProcessStatus(
          req,
          id,
          data
        );
      if (updated)
        res.json({
          data: updated,
          message: "EnquiryProcessStatus updated successfully",
        });
      else res.status(404).send("EnquiryProcessStatus not found");
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusService-updateEnquiryProcessStatus"
      );
      res.status(500).send("EnquiryProcessStatus update failed");
    }
  }

  public async deleteEnquiryProcessStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted =
        await this.enquiryProcessStatusRepository.deleteEnquiryProcessStatus(
          req,
          id
        );
      if (deleted)
        res.json({
          data: deleted,
          message: "EnquiryProcessStatus deleted successfully",
        });
      else res.status(404).send("EnquiryProcessStatus not found");
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusService-deleteEnquiryProcessStatus"
      );
      res.status(500).send("EnquiryProcessStatus deletion failed");
    }
  }
}

export default EnquiryProcessStatusService;

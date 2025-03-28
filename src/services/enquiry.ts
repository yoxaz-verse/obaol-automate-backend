import { Request, Response } from "express";
import { EnquiryRepository } from "../database/repositories/enquiry"; // Adjust path
import { IPagination } from "@interfaces/pagination"; // or your path
import { buildDynamicQuery } from "../utils/buildDynamicQuery"; // if you have a dynamic filter
import { logError } from "../utils/errorLogger";

export class EnquiryService {
  private enquiryRepository: EnquiryRepository;

  constructor() {
    this.enquiryRepository = new EnquiryRepository();
  }

  public async getEnquiries(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const { page, limit, ...filters } = req.query;
      let dynamicQuery = buildDynamicQuery(filters); // Or build your custom filter
      // Possibly do role-based logic or other checks, if needed

      const enquiries = await this.enquiryRepository.getEnquiries(
        req,
        pagination,
        dynamicQuery
      );

      return res.json({
        data: enquiries,
        message: "Enquiries retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "EnquiryService-getEnquiries");
      return res.status(500).json({ error: "Enquiries retrieval failed" });
    }
  }

  public async getEnquiry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const enquiry = await this.enquiryRepository.getEnquiryById(req, id);
      return res.json({
        data: enquiry,
        message: "Enquiry retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "EnquiryService-getEnquiry");
      return res.status(500).json({ error: "Enquiry retrieval failed" });
    }
  }

  public async createEnquiry(req: Request, res: Response) {
    try {
      const enquiryData = req.body;
      const newEnquiry = await this.enquiryRepository.createEnquiry(
        req,
        enquiryData
      );
      return res.status(201).json({
        data: newEnquiry,
        message: "Enquiry created successfully",
      });
    } catch (error) {
      logError(error, req, "EnquiryService-createEnquiry");
      return res.status(500).json({ error: "Enquiry creation failed" });
    }
  }

  public async updateEnquiry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const enquiryData = req.body;
      const updated = await this.enquiryRepository.updateEnquiry(
        req,
        id,
        enquiryData
      );
      return res.json({
        data: updated,
        message: "Enquiry updated successfully",
      });
    } catch (error) {
      logError(error, req, "EnquiryService-updateEnquiry");
      return res.status(500).json({ error: "Enquiry update failed" });
    }
  }

  public async deleteEnquiry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.enquiryRepository.deleteEnquiry(req, id);
      return res.json({
        data: deleted,
        message: "Enquiry deleted successfully",
      });
    } catch (error) {
      logError(error, req, "EnquiryService-deleteEnquiry");
      return res.status(500).json({ error: "Enquiry deletion failed" });
    }
  }
}

import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import PincodeEntryRepository from "../database/repositories/pincodeEntry";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class PincodeEntryService {
  private pincodeEntryRepository: PincodeEntryRepository;

  constructor() {
    this.pincodeEntryRepository = new PincodeEntryRepository();
  }

  public async getPincodeEntrys(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.pincodeEntryRepository.getPincodeEntrys(req, pagination, dynamicQuery);
      res.status(200).json({
        message: "PincodeEntrys retrieved successfully",
        ...result
      });
    } catch (error) {
      logError(error, req, "PincodeEntryService-getPincodeEntrys");
      res.status(500).send("PincodeEntrys retrieval failed");
    }
  }

  public async getPincodeEntry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.pincodeEntryRepository.getPincodeEntryById(req, id);
      if (item) res.json(item);
      else res.status(404).send("PincodeEntry not found");
    } catch (error) {
      logError(error, req, "PincodeEntryService-getPincodeEntry");
      res.status(500).send("Error retrieving pincodeEntry");
    }
  }

  public async createPincodeEntry(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.pincodeEntryRepository.createPincodeEntry(req, data);
      res.status(201).json({ data: created, message: "PincodeEntry created successfully" });
    } catch (error) {
      logError(error, req, "PincodeEntryService-createPincodeEntry");
      res.status(500).send("PincodeEntry creation failed");
    }
  }

  public async updatePincodeEntry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.pincodeEntryRepository.updatePincodeEntry(req, id, data);
      if (updated) res.json({ data: updated, message: "PincodeEntry updated successfully" });
      else res.status(404).send("PincodeEntry not found");
    } catch (error) {
      logError(error, req, "PincodeEntryService-updatePincodeEntry");
      res.status(500).send("PincodeEntry update failed");
    }
  }

  public async deletePincodeEntry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.pincodeEntryRepository.deletePincodeEntry(req, id);
      if (deleted) res.json({ data: deleted, message: "PincodeEntry deleted successfully" });
      else res.status(404).send("PincodeEntry not found");
    } catch (error) {
      logError(error, req, "PincodeEntryService-deletePincodeEntry");
      res.status(500).send("PincodeEntry deletion failed");
    }
  }
}

export default PincodeEntryService;

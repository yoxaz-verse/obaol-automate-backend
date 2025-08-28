import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import CertificationRepository from "../database/repositories/certification";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class CertificationService {
  private certificationRepository: CertificationRepository;

  constructor() {
    this.certificationRepository = new CertificationRepository();
  }

  public async getCertifications(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.certificationRepository.getCertifications(req, pagination, dynamicQuery);
      res.json({
        message: "Certifications retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "CertificationService-getCertifications");
      res.status(500).send("Certifications retrieval failed");
    }
  }

  public async getCertification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.certificationRepository.getCertificationById(req, id);
      if (item) res.json(item);
      else res.status(404).send("Certification not found");
    } catch (error) {
      logError(error, req, "CertificationService-getCertification");
      res.status(500).send("Error retrieving certification");
    }
  }

  public async createCertification(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.certificationRepository.createCertification(req, data);
      res.status(201).json({ data: created, message: "Certification created successfully" });
    } catch (error) {
      logError(error, req, "CertificationService-createCertification");
      res.status(500).send("Certification creation failed");
    }
  }

  public async updateCertification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.certificationRepository.updateCertification(req, id, data);
      if (updated) res.json({ data: updated, message: "Certification updated successfully" });
      else res.status(404).send("Certification not found");
    } catch (error) {
      logError(error, req, "CertificationService-updateCertification");
      res.status(500).send("Certification update failed");
    }
  }

  public async deleteCertification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.certificationRepository.deleteCertification(req, id);
      if (deleted) res.json({ data: deleted, message: "Certification deleted successfully" });
      else res.status(404).send("Certification not found");
    } catch (error) {
      logError(error, req, "CertificationService-deleteCertification");
      res.status(500).send("Certification deletion failed");
    }
  }
}

export default CertificationService;

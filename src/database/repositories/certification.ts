import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { CertificationModel } from "../../database/models/certification";

class CertificationRepository {
  public async getCertifications(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await CertificationModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await CertificationModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "CertificationRepository-getCertifications");
      throw error;
    }
  }

  public async getCertificationById(req: Request, id: string) {
    try {
      const doc = await CertificationModel.findById(id);
      if (!doc) throw new Error("Certification not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "CertificationRepository-getCertificationById");
      throw error;
    }
  }

  public async createCertification(req: Request, data: any) {
    try {
      const created = await CertificationModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "CertificationRepository-createCertification");
      throw error;
    }
  }

  public async updateCertification(req: Request, id: string, data: any) {
    try {
      const updated = await CertificationModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update certification");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "CertificationRepository-updateCertification");
      throw error;
    }
  }

  public async deleteCertification(req: Request, id: string) {
    try {
      const deleted = await CertificationModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete certification");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "CertificationRepository-deleteCertification");
      throw error;
    }
  }
}

export default CertificationRepository;

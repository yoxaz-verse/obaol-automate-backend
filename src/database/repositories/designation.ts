import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { DesignationModel } from "../../database/models/designation";

class DesignationRepository {
  public async getDesignations(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await DesignationModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await DesignationModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "DesignationRepository-getDesignations");
      throw error;
    }
  }

  public async getDesignationById(req: Request, id: string) {
    try {
      const doc = await DesignationModel.findById(id);
      if (!doc) throw new Error("Designation not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "DesignationRepository-getDesignationById");
      throw error;
    }
  }

  public async createDesignation(req: Request, data: any) {
    try {
      const created = await DesignationModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "DesignationRepository-createDesignation");
      throw error;
    }
  }

  public async updateDesignation(req: Request, id: string, data: any) {
    try {
      const updated = await DesignationModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update designation");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "DesignationRepository-updateDesignation");
      throw error;
    }
  }

  public async deleteDesignation(req: Request, id: string) {
    try {
      const deleted = await DesignationModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete designation");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "DesignationRepository-deleteDesignation");
      throw error;
    }
  }
}

export default DesignationRepository;

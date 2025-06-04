import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { DistrictModel } from "../../database/models/district";

class DistrictRepository {
  public async getDistricts(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await DistrictModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await DistrictModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "DistrictRepository-getDistricts");
      throw error;
    }
  }

  public async getDistrictById(req: Request, id: string) {
    try {
      const doc = await DistrictModel.findById(id);
      if (!doc) throw new Error("District not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "DistrictRepository-getDistrictById");
      throw error;
    }
  }

  public async createDistrict(req: Request, data: any) {
    try {
      const created = await DistrictModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "DistrictRepository-createDistrict");
      throw error;
    }
  }

  public async updateDistrict(req: Request, id: string, data: any) {
    try {
      const updated = await DistrictModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update district");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "DistrictRepository-updateDistrict");
      throw error;
    }
  }

  public async deleteDistrict(req: Request, id: string) {
    try {
      const deleted = await DistrictModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete district");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "DistrictRepository-deleteDistrict");
      throw error;
    }
  }
}

export default DistrictRepository;

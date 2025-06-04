import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { CityModel } from "../../database/models/city";

class CityRepository {
  public async getCitys(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await CityModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await CityModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "CityRepository-getCitys");
      throw error;
    }
  }

  public async getCityById(req: Request, id: string) {
    try {
      const doc = await CityModel.findById(id);
      if (!doc) throw new Error("City not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "CityRepository-getCityById");
      throw error;
    }
  }

  public async createCity(req: Request, data: any) {
    try {
      const created = await CityModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "CityRepository-createCity");
      throw error;
    }
  }

  public async updateCity(req: Request, id: string, data: any) {
    try {
      const updated = await CityModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update city");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "CityRepository-updateCity");
      throw error;
    }
  }

  public async deleteCity(req: Request, id: string) {
    try {
      const deleted = await CityModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete city");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "CityRepository-deleteCity");
      throw error;
    }
  }
}

export default CityRepository;

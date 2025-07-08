import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { CountryModel } from "../../database/models/country";

class CountryRepository {
  public async getCountrys(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await CountryModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await CountryModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "CountryRepository-getCountrys");
      throw error;
    }
  }

  public async getCountryById(req: Request, id: string) {
    try {
      const doc = await CountryModel.findById(id);
      if (!doc) throw new Error("Country not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "CountryRepository-getCountryById");
      throw error;
    }
  }

  public async createCountry(req: Request, data: any) {
    try {
      const created = await CountryModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "CountryRepository-createCountry");
      throw error;
    }
  }

  public async updateCountry(req: Request, id: string, data: any) {
    try {
      const updated = await CountryModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update country");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "CountryRepository-updateCountry");
      throw error;
    }
  }

  public async deleteCountry(req: Request, id: string) {
    try {
      const deleted = await CountryModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete country");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "CountryRepository-deleteCountry");
      throw error;
    }
  }
}

export default CountryRepository;

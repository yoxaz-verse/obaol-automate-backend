import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { PincodeEntryModel } from "../../database/models/pincodeEntry";

class PincodeEntryRepository {
  public async getPincodeEntrys(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await PincodeEntryModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await PincodeEntryModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "PincodeEntryRepository-getPincodeEntrys");
      throw error;
    }
  }

  public async getPincodeEntryById(req: Request, id: string) {
    try {
      const doc = await PincodeEntryModel.findById(id);
      if (!doc) throw new Error("PincodeEntry not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "PincodeEntryRepository-getPincodeEntryById");
      throw error;
    }
  }

  public async createPincodeEntry(req: Request, data: any) {
    try {
      const created = await PincodeEntryModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "PincodeEntryRepository-createPincodeEntry");
      throw error;
    }
  }

  public async updatePincodeEntry(req: Request, id: string, data: any) {
    try {
      const updated = await PincodeEntryModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update pincodeEntry");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "PincodeEntryRepository-updatePincodeEntry");
      throw error;
    }
  }

  public async deletePincodeEntry(req: Request, id: string) {
    try {
      const deleted = await PincodeEntryModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete pincodeEntry");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "PincodeEntryRepository-deletePincodeEntry");
      throw error;
    }
  }
}

export default PincodeEntryRepository;

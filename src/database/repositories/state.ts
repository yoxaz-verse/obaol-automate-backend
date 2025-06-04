import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { StateModel } from "../../database/models/state";

class StateRepository {
  public async getStates(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await StateModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      console.log("query", query);

      const totalCount = await StateModel.countDocuments(query);
      console.log(totalCount);

      return {
        data: docs.map((d) => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "StateRepository-getStates");
      throw error;
    }
  }

  public async getStateById(req: Request, id: string) {
    try {
      const doc = await StateModel.findById(id);
      if (!doc) throw new Error("State not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "StateRepository-getStateById");
      throw error;
    }
  }

  public async createState(req: Request, data: any) {
    try {
      const created = await StateModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "StateRepository-createState");
      throw error;
    }
  }

  public async updateState(req: Request, id: string, data: any) {
    try {
      const updated = await StateModel.findByIdAndUpdate(id, data, {
        new: true,
      });
      if (!updated) throw new Error("Failed to update state");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "StateRepository-updateState");
      throw error;
    }
  }

  public async deleteState(req: Request, id: string) {
    try {
      const deleted = await StateModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete state");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "StateRepository-deleteState");
      throw error;
    }
  }
}

export default StateRepository;

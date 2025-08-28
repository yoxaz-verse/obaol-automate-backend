import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { JobTypeModel } from "../../database/models/jobType";

class JobTypeRepository {
  public async getJobTypes(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await JobTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await JobTypeModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "JobTypeRepository-getJobTypes");
      throw error;
    }
  }

  public async getJobTypeById(req: Request, id: string) {
    try {
      const doc = await JobTypeModel.findById(id);
      if (!doc) throw new Error("JobType not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "JobTypeRepository-getJobTypeById");
      throw error;
    }
  }

  public async createJobType(req: Request, data: any) {
    try {
      const created = await JobTypeModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "JobTypeRepository-createJobType");
      throw error;
    }
  }

  public async updateJobType(req: Request, id: string, data: any) {
    try {
      const updated = await JobTypeModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update jobType");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "JobTypeRepository-updateJobType");
      throw error;
    }
  }

  public async deleteJobType(req: Request, id: string) {
    try {
      const deleted = await JobTypeModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete jobType");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "JobTypeRepository-deleteJobType");
      throw error;
    }
  }
}

export default JobTypeRepository;

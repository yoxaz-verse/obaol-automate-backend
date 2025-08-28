import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { JobRoleModel } from "../../database/models/jobRole";

class JobRoleRepository {
  public async getJobRoles(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await JobRoleModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await JobRoleModel.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "JobRoleRepository-getJobRoles");
      throw error;
    }
  }

  public async getJobRoleById(req: Request, id: string) {
    try {
      const doc = await JobRoleModel.findById(id);
      if (!doc) throw new Error("JobRole not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "JobRoleRepository-getJobRoleById");
      throw error;
    }
  }

  public async createJobRole(req: Request, data: any) {
    try {
      const created = await JobRoleModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "JobRoleRepository-createJobRole");
      throw error;
    }
  }

  public async updateJobRole(req: Request, id: string, data: any) {
    try {
      const updated = await JobRoleModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update jobRole");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "JobRoleRepository-updateJobRole");
      throw error;
    }
  }

  public async deleteJobRole(req: Request, id: string) {
    try {
      const deleted = await JobRoleModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete jobRole");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "JobRoleRepository-deleteJobRole");
      throw error;
    }
  }
}

export default JobRoleRepository;

import { Request } from "express";
import { ActivityStatusModel } from "../models/activityStatus";
import { IActivityStatus, ICreateActivityStatus, IUpdateActivityStatus } from "../../interfaces/activityStatus";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ActivityStatusRepository {
  public async getActivityStatuses(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IActivityStatus[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const activityStatuses = await ActivityStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IActivityStatus[]>();

      const totalCount = await ActivityStatusModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: activityStatuses,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-getActivityStatuses");
      throw error;
    }
  }

  public async getActivityStatusById(req: Request, id: string): Promise<IActivityStatus> {
    try {
      const activityStatus = await ActivityStatusModel.findById(id).lean<IActivityStatus>();
      if (!activityStatus || activityStatus.isDeleted) {
        throw new Error("ActivityStatus not found");
      }
      return activityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-getActivityStatusById");
      throw error;
    }
  }

  public async createActivityStatus(
    req: Request,
    activityStatusData: ICreateActivityStatus
  ): Promise<IActivityStatus> {
    try {
      const newActivityStatus = await ActivityStatusModel.create(activityStatusData);
      return newActivityStatus.toObject() as IActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-createActivityStatus");
      throw error;
    }
  }

  public async updateActivityStatus(
    req: Request,
    id: string,
    activityStatusData: IUpdateActivityStatus
  ): Promise<IActivityStatus> {
    try {
      const updatedActivityStatus = await ActivityStatusModel.findByIdAndUpdate(id, activityStatusData, {
        new: true,
      }).lean<IActivityStatus>();
      if (!updatedActivityStatus || updatedActivityStatus.isDeleted) {
        throw new Error("Failed to update ActivityStatus");
      }
      return updatedActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-updateActivityStatus");
      throw error;
    }
  }

  public async deleteActivityStatus(req: Request, id: string): Promise<IActivityStatus> {
    try {
      const deletedActivityStatus = await ActivityStatusModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).lean<IActivityStatus>();
      if (!deletedActivityStatus) {
        throw new Error("Failed to delete ActivityStatus");
      }
      return deletedActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-deleteActivityStatus");
      throw error;
    }
  }
}

export default ActivityStatusRepository;

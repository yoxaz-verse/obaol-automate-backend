import { Request } from "express";
import { ActivityStatusModel } from "../models/activityStatus";
import {
  IActivityStatus,
  ICreateActivityStatus,
  IUpdateActivityStatus,
} from "../../interfaces/activityStatus";
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
        .lean();

      const totalCount = await ActivityStatusModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: activityStatuses as IActivityStatus[],
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityStatusRepository-getActivityStatuses"
      );
      throw error;
    }
  }

  public async getActivityStatusById(
    req: Request,
    id: string
  ): Promise<IActivityStatus> {
    try {
      const activityStatus = await ActivityStatusModel.findById(id).lean();
      if (!activityStatus) {
        throw new Error("Activity Status not found");
      }
      return activityStatus as IActivityStatus;
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityStatusRepository-getActivityStatusById"
      );
      throw error;
    }
  }

  public async createActivityStatus(
    req: Request,
    activityStatusData: ICreateActivityStatus
  ): Promise<IActivityStatus> {
    try {
      const newActivityStatus = await ActivityStatusModel.create(
        activityStatusData
      );
      return newActivityStatus.toObject();
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityStatusRepository-createActivityStatus"
      );
      throw error;
    }
  }

  public async updateActivityStatus(
    req: Request,
    id: string,
    activityStatusData: Partial<IUpdateActivityStatus>
  ): Promise<IActivityStatus> {
    try {
      const updatedActivityStatus = await ActivityStatusModel.findByIdAndUpdate(
        id,
        activityStatusData,
        {
          new: true,
        }
      );
      if (!updatedActivityStatus) {
        throw new Error("Failed to update activity status");
      }
      return updatedActivityStatus.toObject();
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityStatusRepository-updateActivityStatus"
      );
      throw error;
    }
  }

  public async deleteActivityStatus(
    req: Request,
    id: string
  ): Promise<IActivityStatus> {
    try {
      const deletedActivityStatus = await ActivityStatusModel.findByIdAndDelete(
        id
      );
      if (!deletedActivityStatus) {
        throw new Error("Failed to delete activity status");
      }
      return deletedActivityStatus.toObject();
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityStatusRepository-deleteActivityStatus"
      );
      throw error;
    }
  }
}

export default ActivityStatusRepository;

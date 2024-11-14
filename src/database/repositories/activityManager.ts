import { Request } from "express";
import { ActivityManagerModel } from "../models/activityManager";
import { ICreateActivityManager, IUpdateActivityManager } from "../../interfaces/activityManager";
import { logError } from "../../utils/errorLogger";
import { IActivityManager } from "../../interfaces/activityManager";

class ActivityManagerRepository {
  public async getActivityManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IActivityManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ActivityManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const activityManagers = await ActivityManagerModel.find(query)
        .populate("admin", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: activityManagers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-getActivityManagers");
      throw error;
    }
  }

  public async getActivityManagerById(req: Request, id: string): Promise<IActivityManager> {
    try {
      const activityManagerDoc = await ActivityManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "name");

      if (!activityManagerDoc) {
        throw new Error("ActivityManager not found");
      }

      return activityManagerDoc;
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-getActivityManagerById");
      throw error;
    }
  }

  public async createActivityManager(
    req: Request,
    activityManagerData: ICreateActivityManager
  ): Promise<IActivityManager> {
    try {
      const newActivityManager = await ActivityManagerModel.create(activityManagerData);
      return newActivityManager;
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-createActivityManager");
      throw error;
    }
  }

  public async updateActivityManager(
    req: Request,
    id: string,
    activityManagerData: Partial<IUpdateActivityManager>
  ): Promise<IActivityManager> {
    try {
      const updatedActivityManager = await ActivityManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        activityManagerData,
        { new: true }
      ).populate("admin", "name");
      if (!updatedActivityManager) {
        throw new Error("Failed to update ActivityManager");
      }
      return updatedActivityManager;
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-updateActivityManager");
      throw error;
    }
  }

  public async deleteActivityManager(req: Request, id: string): Promise<IActivityManager> {
    try {
      const deletedActivityManager = await ActivityManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "name");
      if (!deletedActivityManager) {
        throw new Error("Failed to delete ActivityManager");
      }
      return deletedActivityManager;
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-deleteActivityManager");
      throw error;
    }
  }
}

export default ActivityManagerRepository;

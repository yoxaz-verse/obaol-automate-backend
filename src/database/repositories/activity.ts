import { Request } from "express";
import { ActivityModel } from "../models/activity";
import {
  IActivity,
  ICreateActivity,
  IUpdateActivity,
} from "../../interfaces/activity";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ActivityRepository {
  public async getActivities(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IActivity[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const activities = await ActivityModel.find(query)
        .populate("project")
        .populate("workers")
        .populate("updatedBy")
        .populate("status")
        .populate("statusHistory")
        .populate("customer")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ActivityModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: activities as IActivity[],
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivities");
      throw error;
    }
  }

  public async getActivityById(req: Request, id: string): Promise<IActivity> {
    try {
      const activity = await ActivityModel.findById(id)
        .populate("project")
        .populate("workers")
        .populate("updatedBy")
        .populate("status")
        .populate("statusHistory")
        .populate("customer")
        .lean();
      if (!activity) {
        throw new Error("Activity not found");
      }
      return activity as IActivity;
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivityById");
      throw error;
    }
  }

  public async createActivity(
    req: Request,
    activityData: ICreateActivity
  ): Promise<IActivity> {
    try {
      const newActivity = await ActivityModel.create(activityData);
      return newActivity.toObject();
    } catch (error) {
      await logError(error, req, "ActivityRepository-createActivity");
      throw error;
    }
  }

  public async updateActivity(
    req: Request,
    id: string,
    activityData: Partial<IUpdateActivity>
  ): Promise<IActivity> {
    try {
      const updatedActivity = await ActivityModel.findByIdAndUpdate(
        id,
        activityData,
        {
          new: true,
        }
      )
        .populate("project")
        .populate("workers")
        .populate("updatedBy")
        .populate("status")
        .populate("statusHistory")
        .populate("customer");
      if (!updatedActivity) {
        throw new Error("Failed to update activity");
      }
      return updatedActivity.toObject();
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivity");
      throw error;
    }
  }

  public async deleteActivity(req: Request, id: string): Promise<IActivity> {
    try {
      const deletedActivity = await ActivityModel.findByIdAndDelete(id);
      if (!deletedActivity) {
        throw new Error("Failed to delete activity");
      }
      return deletedActivity.toObject();
    } catch (error) {
      await logError(error, req, "ActivityRepository-deleteActivity");
      throw error;
    }
  }
}

export default ActivityRepository;

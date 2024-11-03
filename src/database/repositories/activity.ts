import { ActivityModel } from "../models/activity";
import { logError } from "../../utils/errorLogger";
import { Request } from "express";

class ActivityRepository {
  public async getActivities(req: Request, pagination: any, search: string) {
    try {
      const query: any = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      return await ActivityModel.find(query)
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .populate("project workers updatedBy status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivities");
      throw error;
    }
  }

  public async getActivity(req: Request, id: string) {
    try {
      return await ActivityModel.findById(id)
        .populate("project workers updatedBy status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivity");
      throw error;
    }
  }

  public async createActivity(req: Request, activityData: any) {
    try {
      const newActivity = new ActivityModel(activityData);
      return await newActivity.save();
    } catch (error) {
      await logError(error, req, "ActivityRepository-createActivity");
      throw error;
    }
  }

  public async updateActivity(req: Request, id: string, activityData: any) {
    try {
      return await ActivityModel.findByIdAndUpdate(id, activityData, {
        new: true,
      })
        .populate("project workers updatedBy status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivity");
      throw error;
    }
  }

  public async deleteActivity(req: Request, id: string) {
    try {
      return await ActivityModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        {
          new: true,
        }
      )
        .populate("project workers updatedBy status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-deleteActivity");
      throw error;
    }
  }
}

export default ActivityRepository;

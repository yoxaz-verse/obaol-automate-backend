import { ActivityModel } from "../models/activity";
import { logError } from "../../utils/errorLogger";
import { Request } from "express";
import path from "path";

class ActivityRepository {
  public async getActivities(
    req: Request,
    pagination: { page: number; limit: number },
    search: string,
    filters: any
  ) {
    try {
      const query: any = { ...filters, isDeleted: false }; // Combine projectId and role-based filters
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      const totalCount = await ActivityModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;
      const activities = await ActivityModel.find(query)
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .populate("status type activityManager project worker")
        // .select("-updatedBy") // Exclude updatedBy fields
        .exec();

      return { data: activities, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivities");
      throw error;
    }
  }

  public async getActivity(req: Request, id: string) {
    try {
      return await ActivityModel.findById(id)
        .populate({
          path: "project",
          populate: "location",
        })
        .populate("worker status type activityManager")
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
      // await logError(error, req, "ActivityRepository-createActivity");
      throw error;
    }
  }

  public async updateActivity(req: Request, id: string, activityData: any) {
    try {
      return await ActivityModel.findByIdAndUpdate(id, activityData, {
        new: true,
      })
        .populate("project worker status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivity");
      throw error;
    }
  }

  public async updateActivityByCustomId(
    req: Request,
    customId: string,
    activityData: any
  ) {
    try {
      return await ActivityModel.findOneAndUpdate(
        { customId, isDeleted: false },
        activityData,
        { new: true }
      )
        .populate("project worker status type activityManager")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivityByCustomId");
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
        .populate("project worker status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-deleteActivity");
      throw error;
    }
  }

  public async bulkInsertActivities(req: Request, activities: any[]) {
    const results = { success: [], failed: [] };

    for (const activity of activities) {
      try {
        // Validate individual activity
        const isValid = this.validateActivity(activity);
        if (!isValid) {
          continue;
        }

        // Insert into database
        const newActivity = new ActivityModel(activity);
        await newActivity.save();
      } catch (error) {
        await logError(error, req, "ActivityRepository-bulkInsertActivities");
      }
    }

    return results;
  }

  /**
   * Validate an activity.
   */
  private validateActivity(activity: any): boolean {
    if (!activity.title || !activity.description || !activity.project) {
      return false;
    }
    // Add additional validation rules as needed
    return true;
  }
}

export default ActivityRepository;

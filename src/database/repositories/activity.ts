import { ActivityModel } from "../models/activity";
import { logError } from "../../utils/errorLogger";
import { Request } from "express";

class ActivityRepository {
  public async getActivities(
    req: Request,
    pagination: { page: number; limit: number },
    search: string,
    filters: any
  ) {
    try {
      const query: any = { ...filters }; // Combine projectId and role-based filters

      if (search) {
        query.title = { $regex: search, $options: "i" };
      }

      const totalCount = await ActivityModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;
      console.log("Its over here");

      const activities = await ActivityModel.find(query)
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .populate({
          path: "project",
          populate: { path: "projectManager", select: "name email" }, // Populate project manager details
        })
        .populate({
          path: "worker", // Populate workers field
          select: "name", // Limit fields to include
        })

        .populate("status type customer activityManager")
        .select("-updatedBy -updatedByModel") // Exclude updatedBy fields
        .exec();

      console.log(activities);

      return { data: activities, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivities");
      throw error;
    }
  }

  public async getActivity(req: Request, id: string) {
    try {
      return await ActivityModel.findById(id)
        .populate("project worker status type customer activityManager")
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
        .populate("project workers  status type customer")
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
        .populate("project workers  status type customer")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-deleteActivity");
      throw error;
    }
  }
}

export default ActivityRepository;

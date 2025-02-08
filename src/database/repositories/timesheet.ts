import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { TimesheetModel } from "../models/timesheet";
import { ITimesheet } from "../../interfaces/timesheet";
import { ActivityModel } from "../models/activity";

class TimeSheetRepository {
  public async getTimeSheets(
    req: Request,
    pagination: IPagination,
    search: string,
    filters: any
  ): Promise<{
    data: any;
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const query: any = { ...filters }; // Combine dynamic filters
      if (search) {
        query.file = { $regex: search, $options: "i" };
      }

      const timeSheets = await TimesheetModel.find(query)
        .populate("activity")
        .populate({
          path: "createdBy", // Populate the createdBy field
          select: "name email", // Select specific fields if needed
        })
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<any[]>(); // Convert to plain objects

      const totalCount = await TimesheetModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: timeSheets,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-getTimeSheets");
      throw error;
    }
  }

  public async getTimesheetsByUser(
    req: Request,
    userId: string,
    role: string,
    pagination: IPagination,
    search: string,
    filters: any
  ): Promise<{
    data: any;
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      // Step 1: Fetch activities associated with the user
      const activityQuery: any = {};
      if (role === "ActivityManager") {
        activityQuery.activityManager = userId; // Filter by activityManager
      } else if (role === "Worker") {
        activityQuery.worker = userId; // Filter by worker
      } else {
        throw new Error("Invalid role for filtering timesheets");
      }

      // Validate role-based query
      console.log("Activity Query: ", activityQuery);

      // Find all activities for the user
      const activities = await ActivityModel.find(activityQuery)
        .select("_id")
        .lean();
      const activityIds = activities.map((activity: any) => activity._id);

      if (activityIds.length === 0) {
        return {
          data: [],
          totalCount: 0,
          currentPage: pagination.page,
          totalPages: 0,
        };
      }

      // Step 2: Validate and apply filters
      const query: any = { ...filters };

      // Ensure activity filter is valid
      query.activity = { $in: activityIds };

      // Handle search case
      if (search) {
        query.file = { $regex: search, $options: "i" };
      }

      console.log("TimeSheet Query: ", query);

      // Fetch filtered timesheets
      const timeSheets = await TimesheetModel.find(query)
        .populate("activity")
        .populate({
          path: "createdBy",
          select: "name email",
        })
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<any[]>();

      const totalCount = await TimesheetModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: timeSheets,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      console.error("Error in getTimesheetsByUser: ", error);
      await logError(error, req, "TimeSheetRepository-getTimesheetsByUser");
      throw error;
    }
  }

  public async getTimeSheetById(req: Request, id: string): Promise<any> {
    try {
      const timeSheet = await TimesheetModel.findById(id)
        .populate("activity activityManager worker")
        .lean<any>();
      if (!timeSheet || timeSheet.isDeleted) {
        throw new Error("TimeSheet not found");
      }
      return timeSheet;
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-getTimeSheetById");
      throw error;
    }
  }

  public async createTimeSheet(req: Request, timeSheetData: any): Promise<any> {
    try {
      const newTimeSheet = await TimesheetModel.create(timeSheetData);
      return newTimeSheet;
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-createTimeSheet");
      throw error;
    }
  }

  public async updateTimeSheet(
    req: Request,
    id: string,
    updateData: Partial<ITimesheet>
  ): Promise<ITimesheet> {
    try {
      const updatedTimeSheet = await TimesheetModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true, // Return the updated document
          runValidators: true, // Run schema validations
        }
      )
        .populate("activity")
        .lean<any>();
      if (!updatedTimeSheet || updatedTimeSheet.isDeleted) {
        throw new Error("Failed to update timeSheet");
      }
      return updatedTimeSheet;
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-updateTimeSheet");
      throw error;
    }
  }

  public async deleteTimeSheet(req: Request, id: string): Promise<any> {
    try {
      const deletedTimeSheet = await TimesheetModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("activity")
        .lean<any>();
      if (!deletedTimeSheet) {
        throw new Error("Failed to delete timeSheet");
      }
      return deletedTimeSheet;
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-deleteTimeSheet");
      throw error;
    }
  }
}

export default TimeSheetRepository;

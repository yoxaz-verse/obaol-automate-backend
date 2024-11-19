import { Request } from "express";
import { TimesheetModel } from "../models/timesheet";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class TimesheetRepository {
  public async getTimesheets(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: any;
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.file = { $regex: search, $options: "i" };
      }
      const timesheets = await TimesheetModel.find(query)
        .populate("activity activityManager worker")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<any[]>();

      const totalCount = await TimesheetModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: timesheets,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "TimesheetRepository-getTimesheets");
      throw error;
    }
  }

  public async getTimesheetById(req: Request, id: string): Promise<any> {
    try {
      const timesheet = await TimesheetModel.findById(id)
        .populate("activity activityManager worker")
        .lean<any>();
      if (!timesheet || timesheet.isDeleted) {
        throw new Error("Timesheet not found");
      }
      return timesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-getTimesheetById");
      throw error;
    }
  }

  public async createTimesheet(req: Request, timesheetData: any): Promise<any> {
    try {
      const newTimesheet = await TimesheetModel.create(timesheetData);
      return newTimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-createTimesheet");
      throw error;
    }
  }
  public async updateTimesheet(
    req: Request,
    id: string,
    timesheetData: any
  ): Promise<any> {
    try {
      const updatedTimesheet = await TimesheetModel.findByIdAndUpdate(
        id,
        timesheetData,
        {
          new: true,
        }
      )
        .populate("activity activityManager worker")
        .lean<any>();
      if (!updatedTimesheet || updatedTimesheet.isDeleted) {
        throw new Error("Failed to update timesheet");
      }
      return updatedTimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-updateTimesheet");
      throw error;
    }
  }

  public async deleteTimesheet(req: Request, id: string): Promise<any> {
    try {
      const deletedTimesheet = await TimesheetModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("activity activityManager worker")
        .lean<any>();
      if (!deletedTimesheet) {
        throw new Error("Failed to delete timesheet");
      }
      return deletedTimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-deleteTimesheet");
      throw error;
    }
  }
}

export default TimesheetRepository;

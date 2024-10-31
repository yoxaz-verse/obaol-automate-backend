import { Request } from "express";
import { TimesheetModel } from "../models/timesheet";
import { ITimesheet, ICreateTimesheet, IUpdateTimesheet } from "../../interfaces/timesheet";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class TimesheetRepository {
  public async getTimesheets(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ITimesheet[];
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
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<ITimesheet[]>();

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

  public async getTimesheetById(req: Request, id: string): Promise<ITimesheet> {
    try {
      const timesheet = await TimesheetModel.findById(id)
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .lean<ITimesheet>();
      if (!timesheet || timesheet.isDeleted) {
        throw new Error("Timesheet not found");
      }
      return timesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-getTimesheetById");
      throw error;
    }
  }

  public async createTimesheet(
    req: Request,
    timesheetData: ICreateTimesheet
  ): Promise<ITimesheet> {
    try {
      const newTimesheet = await TimesheetModel.create(timesheetData);
      return newTimesheet.toObject() as ITimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-createTimesheet");
      throw error;
    }
  }

  public async updateTimesheet(
    req: Request,
    id: string,
    timesheetData: IUpdateTimesheet
  ): Promise<ITimesheet> {
    try {
      const updatedTimesheet = await TimesheetModel.findByIdAndUpdate(id, timesheetData, {
        new: true,
      })
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .lean<ITimesheet>();
      if (!updatedTimesheet || updatedTimesheet.isDeleted) {
        throw new Error("Failed to update timesheet");
      }
      return updatedTimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-updateTimesheet");
      throw error;
    }
  }

  public async deleteTimesheet(req: Request, id: string): Promise<ITimesheet> {
    try {
      const deletedTimesheet = await TimesheetModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .lean<ITimesheet>();
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

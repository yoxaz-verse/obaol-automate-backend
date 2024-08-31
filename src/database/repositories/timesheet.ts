import { Request } from "express";
import { TimesheetModel } from "../models/timesheet";
import { ITimesheet, ICreateTimesheet, IUpdateTimesheet } from "../../interfaces/timesheet";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import mongoose from "mongoose";

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
        .lean();

      const mappedTimesheets = timesheets.map((timesheet) => ({
        _id: (timesheet._id as mongoose.Types.ObjectId).toString(), // Explicit type assertion
        activity: timesheet.activity as any,
        worker: timesheet.worker as any,
        manager: timesheet.manager as any,
        startTime: timesheet.startTime,
        endTime: timesheet.endTime,
        hoursSpent: timesheet.hoursSpent,
        date: timesheet.date,
        file: timesheet.file,
        isPending: timesheet.isPending,
        isRejected: timesheet.isRejected,
        isAccepted: timesheet.isAccepted,
        isResubmitted: timesheet.isResubmitted,
        rejectionReason: timesheet.rejectionReason,
      })) as ITimesheet[];

      const totalCount = await TimesheetModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: mappedTimesheets,
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
        .lean();

      if (!timesheet) {
        throw new Error("Timesheet not found");
      }

      const mappedTimesheet = {
        _id: (timesheet._id as mongoose.Types.ObjectId).toString(), // Explicit type assertion
        activity: timesheet.activity as any,
        worker: timesheet.worker as any,
        manager: timesheet.manager as any,
        startTime: timesheet.startTime,
        endTime: timesheet.endTime,
        hoursSpent: timesheet.hoursSpent,
        date: timesheet.date,
        file: timesheet.file,
        isPending: timesheet.isPending,
        isRejected: timesheet.isRejected,
        isAccepted: timesheet.isAccepted,
        isResubmitted: timesheet.isResubmitted,
        rejectionReason: timesheet.rejectionReason,
      };

      return mappedTimesheet as ITimesheet;
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
      return {
        _id: (newTimesheet._id as mongoose.Types.ObjectId).toString(), // Explicit type assertion
        activity: newTimesheet.activity as any,
        worker: newTimesheet.worker as any,
        manager: newTimesheet.manager as any,
        startTime: newTimesheet.startTime,
        endTime: newTimesheet.endTime,
        hoursSpent: newTimesheet.hoursSpent,
        date: newTimesheet.date,
        file: newTimesheet.file,
        isPending: newTimesheet.isPending,
        isRejected: newTimesheet.isRejected,
        isAccepted: newTimesheet.isAccepted,
        isResubmitted: newTimesheet.isResubmitted,
        rejectionReason: newTimesheet.rejectionReason,
      } as ITimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-createTimesheet");
      throw error;
    }
  }

  public async updateTimesheet(
    req: Request,
    id: string,
    timesheetData: Partial<IUpdateTimesheet>
  ): Promise<ITimesheet> {
    try {
      const updatedTimesheet = await TimesheetModel.findByIdAndUpdate(id, timesheetData, {
        new: true,
      })
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .lean();

      if (!updatedTimesheet) {
        throw new Error("Failed to update timesheet");
      }

      const mappedUpdatedTimesheet = {
        _id: (updatedTimesheet._id as mongoose.Types.ObjectId).toString(), // Explicit type assertion
        activity: updatedTimesheet.activity as any,
        worker: updatedTimesheet.worker as any,
        manager: updatedTimesheet.manager as any,
        startTime: updatedTimesheet.startTime,
        endTime: updatedTimesheet.endTime,
        hoursSpent: updatedTimesheet.hoursSpent,
        date: updatedTimesheet.date,
        file: updatedTimesheet.file,
        isPending: updatedTimesheet.isPending,
        isRejected: updatedTimesheet.isRejected,
        isAccepted: updatedTimesheet.isAccepted,
        isResubmitted: updatedTimesheet.isResubmitted,
        rejectionReason: updatedTimesheet.rejectionReason,
      };

      return mappedUpdatedTimesheet as ITimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-updateTimesheet");
      throw error;
    }
  }

  public async deleteTimesheet(req: Request, id: string): Promise<ITimesheet> {
    try {
      const deletedTimesheet = await TimesheetModel.findByIdAndDelete(id)
        .populate("activity")
        .populate("worker")
        .populate("manager")
        .lean();

      if (!deletedTimesheet) {
        throw new Error("Failed to delete timesheet");
      }

      const mappedDeletedTimesheet = {
        _id: (deletedTimesheet._id as mongoose.Types.ObjectId).toString(), // Explicit type assertion
        activity: deletedTimesheet.activity as any,
        worker: deletedTimesheet.worker as any,
        manager: deletedTimesheet.manager as any,
        startTime: deletedTimesheet.startTime,
        endTime: deletedTimesheet.endTime,
        hoursSpent: deletedTimesheet.hoursSpent,
        date: deletedTimesheet.date,
        file: deletedTimesheet.file,
        isPending: deletedTimesheet.isPending,
        isRejected: deletedTimesheet.isRejected,
        isAccepted: deletedTimesheet.isAccepted,
        isResubmitted: deletedTimesheet.isResubmitted,
        rejectionReason: deletedTimesheet.rejectionReason,
      };

      return mappedDeletedTimesheet as ITimesheet;
    } catch (error) {
      await logError(error, req, "TimesheetRepository-deleteTimesheet");
      throw error;
    }
  }
}

export default TimesheetRepository;

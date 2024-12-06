import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { TimesheetModel } from "../../database/models/timesheet";
import { ITimesheet } from "@interfaces/timesheet";

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
        .populate("activity worker")
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
      await logError(error, req, "TimeSheetRepository-getTimeSheets");
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
        .populate("activity worker")
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
        .populate("activity worker")
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

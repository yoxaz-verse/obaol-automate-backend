import { Request, Response } from "express";
import TimesheetRepository from "../database/repositories/timesheet";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { ITimesheet } from "@interfaces/timesheet";
import { DecodedToken } from "../middlewares/auth";

class TimeSheetService {
  private timeSheetRepository: TimesheetRepository;

  constructor() {
    this.timeSheetRepository = new TimesheetRepository();
  }

  public async getTimeSheets(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const { activityId } = req.query; // Optional project filter
      const userId = req.user?.id; // User ID from middleware
      const userRole = req.user?.role; // User Role from middleware

      const filters: any = {};

      if (activityId) {
        // If activityId is provided, filter by it
        filters.project = activityId;
      }
      const timeSheets = await this.timeSheetRepository.getTimeSheets(
        req,
        pagination,
        search,
        filters
      );
      res.sendArrayFormatted(timeSheets, "TimeSheets retrieved successfully");
    } catch (error) {
      await logError(error, req, "TimeSheetService-getTimeSheets");
      res.sendError(error, "TimeSheets retrieval failed");
    }
  }

  public async getTimeSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timeSheets = await this.timeSheetRepository.getTimeSheetById(
        req,
        id
      );
      res.sendFormatted(timeSheets, "TimeSheet retrieved successfully");
    } catch (error) {
      await logError(error, req, "TimeSheetService-getTimesheet");
      res.sendError(error, "TimeSheet retrieval failed");
    }
  }

  public async createTimeSheet(req: Request, res: Response) {
    try {
      const tokenData = req.user as any; // Assert type of req.user
      if (!tokenData || !tokenData.role || !tokenData.id) {
        throw new Error("Invalid token data");
      }

      const { id, role } = tokenData;

      const timeSheetData: Partial<ITimesheet> = req.body;

      // Automatically add createdBy and createdByRole
      timeSheetData.createdBy = id; // Add user ID from token
      timeSheetData.createdByRole = role; // Add user role from token

      // // Role-specific logic
      if (role === "Worker") {
        //   // If Worker, save worker-specific details
        timeSheetData.worker = id; // Assume worker ID matches token ID
      } else {
        //   // For other roles, update createdByRole only
      }

      // console.log("TimeSheet Data:", timeSheetData);

      const newTimeSheet = await this.timeSheetRepository.createTimeSheet(
        req,
        timeSheetData
      );
      res.sendFormatted(newTimeSheet, "TimeSheet created successfully", 201);
    } catch (error) {
      await logError(error, req, "TimeSheetService-createTimeSheet");
      res.sendError(error, "TimeSheet creation failed");
    }
  }

  public async updateTimeSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timeSheetData = req.body;
      const updatedTimeSheet = await this.timeSheetRepository.updateTimeSheet(
        req,
        id,
        timeSheetData
      );
      res.sendFormatted(updatedTimeSheet, "TimeSheet updated successfully");
    } catch (error) {
      await logError(error, req, "TimeSheetService-updateTimeSheet");
      res.sendError(error, "TimeSheet update failed");
    }
  }

  public async deleteTimeSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedTimeSheet = await this.timeSheetRepository.deleteTimeSheet(
        req,
        id
      );
      res.sendFormatted(deletedTimeSheet, "TimeSheet deleted successfully");
    } catch (error) {
      await logError(error, req, "TimeSheetService-deleteTimeSheet");
      res.sendError(error, "TimeSheet deletion failed");
    }
  }
}

export default TimeSheetService;

import { Request, Response } from "express";
import TimesheetRepository from "../database/repositories/timesheet";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { ITimesheet } from "@interfaces/timesheet";

class TimeSheetService {
  private timeSheetRepository: TimesheetRepository;

  constructor() {
    this.timeSheetRepository = new TimesheetRepository();
  }

  public async getTimesheetsByUser(req: Request, res: Response) {
    try {
      const tokenData = req.user as any; // Assert type of req.user
      if (!tokenData || !tokenData.role || !tokenData.id) {
        throw new Error("Invalid token data");
      }
      const { isMode } = req.query;

      const { id, role } = tokenData;
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const filters: Record<string, any> = {};
      console.log("id");
      console.log(id);
      console.log("role");
      console.log(role);
      // Dynamic status-based filtering using `isMode`
      if (isMode && typeof isMode === "string") {
        filters[isMode] = true; // Example: { isPending: true }
      }

      const timesheets = await this.timeSheetRepository.getTimesheetsByUser(
        req,
        id,
        role,
        pagination,
        search,
        filters
      );

      res.sendArrayFormatted(
        timesheets,
        "Filtered timesheets retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "TimeSheetService-getTimesheetsByUser");
      res.sendError(error, "Failed to retrieve filtered timesheets");
    }
  }

  public async getTimeSheets(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const { activityId, isMode } = req.query;

      const tokenData = req.user as any;
      if (!tokenData || !tokenData.role || !tokenData.id) {
        throw new Error("Invalid token data");
      }

      const filters: Record<string, any> = {};

      // Optional activity filter
      if (activityId) {
        filters.activity = activityId;
      }

      // Dynamic status-based filtering using `isMode`
      if (isMode && typeof isMode === "string") {
        filters[isMode] = true; // Example: { isPending: true }
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

      // Validate required fields
      const { date, startTime, endTime } = timeSheetData;
      if (!date || !startTime || !endTime) {
        throw new Error("Date, startTime, and endTime are required.");
      }

      // Helper function to create a Date object from the date and time components
      const createDateFromComponents = (baseDate: string, time: any): Date => {
        const date = new Date(baseDate); // Use the base date
        date.setHours(time.hour, time.minute, time.second, time.millisecond);
        return date;
      };

      // Ensure `date` is a string before passing it to `createDateFromComponents`
      const baseDateString =
        typeof date === "string" ? date : date.toISOString();

      // Transform startTime and endTime
      const transformedStartTime = createDateFromComponents(
        baseDateString,
        startTime
      );
      const transformedEndTime = createDateFromComponents(
        baseDateString,
        endTime
      );

      // Replace the original startTime and endTime with transformed values
      timeSheetData.startTime = transformedStartTime;
      timeSheetData.endTime = transformedEndTime;

      // Call the repository method to create a new timesheet
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
      const { status } = req.body;

      // Validate that 'status' is present in the payload
      if (!status || typeof status !== "string") {
        throw new Error("Invalid status value provided.");
      }

      // Define the valid status fields
      const validStatuses = [
        "isPending",
        "isAccepted",
        "isRejected",
        "isResubmitted",
      ];

      // Check if the provided status is valid
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status. Allowed statuses are: ${validStatuses.join(", ")}`
        );
      }

      // Create an object to update only the specified status
      const updateData: Record<string, boolean> = {};
      validStatuses.forEach((key) => {
        updateData[key] = key === status; // Only the specified status is set to true
      });

      // Update the timesheet with the new status
      const updatedTimeSheet = await this.timeSheetRepository.updateTimeSheet(
        req,
        id,
        updateData
      );

      res.sendFormatted(
        updatedTimeSheet,
        "TimeSheet status updated successfully"
      );
    } catch (error) {
      await logError(error, req, "TimeSheetService-updateTimeSheet");
      res.sendError(error, "TimeSheet status update failed");
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

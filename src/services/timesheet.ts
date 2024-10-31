import { Request, Response } from "express";
import TimesheetRepository from "../database/repositories/timesheet";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class TimesheetService {
  private timesheetRepository: TimesheetRepository;

  constructor() {
    this.timesheetRepository = new TimesheetRepository();
  }

  public async getTimesheets(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const timesheets = await this.timesheetRepository.getTimesheets(req, pagination, search);
      res.sendArrayFormatted(timesheets, "Timesheets retrieved successfully");
    } catch (error) {
      await logError(error, req, "TimesheetService-getTimesheets");
      res.sendError(error, "Timesheets retrieval failed");
    }
  }

  public async getTimesheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timesheet = await this.timesheetRepository.getTimesheetById(req, id);
      res.sendFormatted(timesheet, "Timesheet retrieved successfully");
    } catch (error) {
      await logError(error, req, "TimesheetService-getTimesheet");
      res.sendError(error, "Timesheet retrieval failed");
    }
  }

  public async createTimesheet(req: Request, res: Response) {
    try {
      const timesheetData = req.body;
      const newTimesheet = await this.timesheetRepository.createTimesheet(req, timesheetData);
      res.sendFormatted(newTimesheet, "Timesheet created successfully", 201);
    } catch (error) {
      await logError(error, req, "TimesheetService-createTimesheet");
      res.sendError(error, "Timesheet creation failed");
    }
  }

  public async updateTimesheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timesheetData = req.body;
      const updatedTimesheet = await this.timesheetRepository.updateTimesheet(req, id, timesheetData);
      res.sendFormatted(updatedTimesheet, "Timesheet updated successfully");
    } catch (error) {
      await logError(error, req, "TimesheetService-updateTimesheet");
      res.sendError(error, "Timesheet update failed");
    }
  }

  public async deleteTimesheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedTimesheet = await this.timesheetRepository.deleteTimesheet(req, id);
      res.sendFormatted(deletedTimesheet, "Timesheet deleted successfully");
    } catch (error) {
      await logError(error, req, "TimesheetService-deleteTimesheet");
      res.sendError(error, "Timesheet deletion failed");
    }
  }
}

export default TimesheetService;

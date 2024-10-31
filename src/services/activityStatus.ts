import { Request, Response } from "express";
import ActivityStatusRepository from "../database/repositories/activityStatus";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ActivityStatusService {
  private activityStatusRepository: ActivityStatusRepository;

  constructor() {
    this.activityStatusRepository = new ActivityStatusRepository();
  }

  public async getActivityStatuses(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityStatuses = await this.activityStatusRepository.getActivityStatuses(req, pagination, search);
      res.sendArrayFormatted(activityStatuses, "ActivityStatuses retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-getActivityStatuses");
      res.sendError(error, "ActivityStatuses retrieval failed");
    }
  }

  public async getActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityStatus = await this.activityStatusRepository.getActivityStatusById(req, id);
      res.sendFormatted(activityStatus, "ActivityStatus retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-getActivityStatus");
      res.sendError(error, "ActivityStatus retrieval failed");
    }
  }

  public async createActivityStatus(req: Request, res: Response) {
    try {
      const activityStatusData = req.body;
      const newActivityStatus = await this.activityStatusRepository.createActivityStatus(req, activityStatusData);
      res.sendFormatted(newActivityStatus, "ActivityStatus created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityStatusService-createActivityStatus");
      res.sendError(error, "ActivityStatus creation failed");
    }
  }

  public async updateActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityStatusData = req.body;
      const updatedActivityStatus = await this.activityStatusRepository.updateActivityStatus(req, id, activityStatusData);
      res.sendFormatted(updatedActivityStatus, "ActivityStatus updated successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-updateActivityStatus");
      res.sendError(error, "ActivityStatus update failed");
    }
  }

  public async deleteActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivityStatus = await this.activityStatusRepository.deleteActivityStatus(req, id);
      res.sendFormatted(deletedActivityStatus, "ActivityStatus deleted successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-deleteActivityStatus");
      res.sendError(error, "ActivityStatus deletion failed");
    }
  }
}

export default ActivityStatusService;

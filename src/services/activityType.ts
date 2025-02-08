import { Request, Response } from "express";
import ActivityTypeRepository from "../database/repositories/activityType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ActivityTypeService {
  private activityTypeRepository: ActivityTypeRepository;

  constructor() {
    this.activityTypeRepository = new ActivityTypeRepository();
  }

  public async getActivityTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityTypes = await this.activityTypeRepository.getActivityTypes(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(
        activityTypes,
        "ActivityTypes retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ActivityTypeService-getActivityTypes");
      res.sendError(error, "ActivityTypes retrieval failed");
    }
  }

  public async getActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityType =
        await this.activityTypeRepository.getActivityTypeById(req, id);
      res.sendFormatted(activityType, "ActivityType retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-getActivityType");
      res.sendError(error, "ActivityType retrieval failed");
    }
  }

  public async createActivityType(req: Request, res: Response) {
    try {
      const activityTypeData = req.body;
      const newActivityType =
        await this.activityTypeRepository.createActivityType(
          req,
          activityTypeData
        );
      res.sendFormatted(
        newActivityType,
        "ActivityType created successfully",
        201
      );
    } catch (error) {
      await logError(error, req, "ActivityTypeService-createActivityType");
      res.sendError(error, "ActivityType creation failed");
    }
  }

  public async updateActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityTypeData = req.body;
      const updatedActivityType =
        await this.activityTypeRepository.updateActivityType(
          req,
          id,
          activityTypeData
        );
      res.sendFormatted(
        updatedActivityType,
        "ActivityType updated successfully"
      );
    } catch (error) {
      await logError(error, req, "ActivityTypeService-updateActivityType");
      res.sendError(error, "ActivityType update failed");
    }
  }

  public async deleteActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivityType =
        await this.activityTypeRepository.deleteActivityType(req, id);
      res.sendFormatted(
        deletedActivityType,
        "ActivityType deleted successfully"
      );
    } catch (error) {
      await logError(error, req, "ActivityTypeService-deleteActivityType");
      res.sendError(error, "ActivityType deletion failed");
    }
  }
}

export default ActivityTypeService;

// src/services/activityManager.ts

import { Request, Response } from "express";
import ActivityManagerRepository from "../database/repositories/activityManager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { hashPassword } from "../utils/passwordUtils";

class ActivityManagerService {
  private activityManagerRepository: ActivityManagerRepository;

  constructor() {
    this.activityManagerRepository = new ActivityManagerRepository();
  }

  public async getActivityManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityManagers =
        await this.activityManagerRepository.getActivityManagers(
          req,
          pagination,
          search
        );
      res.sendArrayFormatted(
        activityManagers,
        "Customers retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ActivityManagerService-getActivityManagers");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async getActivityManagerById(req: Request, res: Response) {
    try {
      const activityManager =
        await this.activityManagerRepository.getActivityManagerById(
          req,
          req.params.id
        );
      res.json(activityManager);
    } catch (error) { 
      await logError(
        error,
        req,
        "ActivityManagerService-getActivityManagerById"
      );
      res.status(404).json({ error: error });
    }
  }

  public async createActivityManager(req: Request, res: Response) {
    try {
      // Hash password
      req.body.password = await hashPassword(req.body.password);
      const newActivityManager =
        await this.activityManagerRepository.createActivityManager(
          req,
          req.body
        );
      res.status(201).json(newActivityManager);
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerService-createActivityManager"
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async updateActivityManager(req: Request, res: Response) {
    try {
      if (req.body.password) {
        req.body.password = await hashPassword(req.body.password);
      }

      const updatedActivityManager =
        await this.activityManagerRepository.updateActivityManager(
          req,
          req.params.id,
          req.body
        );

      res.json(updatedActivityManager);
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerService-updateActivityManager"
      );
      res.status(404).json({ error: error });
    }
  }

  public async deleteActivityManager(req: Request, res: Response) {
    try {
      const deletedActivityManager =
        await this.activityManagerRepository.deleteActivityManager(
          req,
          req.params.id
        );
      res.json(deletedActivityManager);
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerService-deleteActivityManager"
      );
      res.status(404).json({ error: error });
    }
  }
}

export default ActivityManagerService;

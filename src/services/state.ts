import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import StateRepository from "../database/repositories/state";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class StateService {
  private stateRepository: StateRepository;

  constructor() {
    this.stateRepository = new StateRepository();
  }

  public async getStates(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.stateRepository.getStates(req, pagination, dynamicQuery);
      res.status(200).json({
        message: "States retrieved successfully",
        ...result
      });
    } catch (error) {
      logError(error, req, "StateService-getStates");
      res.status(500).send("States retrieval failed");
    }
  }

  public async getState(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.stateRepository.getStateById(req, id);
      if (item) res.json(item);
      else res.status(404).send("State not found");
    } catch (error) {
      logError(error, req, "StateService-getState");
      res.status(500).send("Error retrieving state");
    }
  }

  public async createState(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.stateRepository.createState(req, data);
      res.status(201).json({ data: created, message: "State created successfully" });
    } catch (error) {
      logError(error, req, "StateService-createState");
      res.status(500).send("State creation failed");
    }
  }

  public async updateState(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.stateRepository.updateState(req, id, data);
      if (updated) res.json({ data: updated, message: "State updated successfully" });
      else res.status(404).send("State not found");
    } catch (error) {
      logError(error, req, "StateService-updateState");
      res.status(500).send("State update failed");
    }
  }

  public async deleteState(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.stateRepository.deleteState(req, id);
      if (deleted) res.json({ data: deleted, message: "State deleted successfully" });
      else res.status(404).send("State not found");
    } catch (error) {
      logError(error, req, "StateService-deleteState");
      res.status(500).send("State deletion failed");
    }
  }
}

export default StateService;

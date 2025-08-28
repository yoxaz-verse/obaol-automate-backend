import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import JobTypeRepository from "../database/repositories/jobType";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class JobTypeService {
  private jobTypeRepository: JobTypeRepository;

  constructor() {
    this.jobTypeRepository = new JobTypeRepository();
  }

  public async getJobTypes(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.jobTypeRepository.getJobTypes(req, pagination, dynamicQuery);
      res.json({
        message: "JobTypes retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "JobTypeService-getJobTypes");
      res.status(500).send("JobTypes retrieval failed");
    }
  }

  public async getJobType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.jobTypeRepository.getJobTypeById(req, id);
      if (item) res.json(item);
      else res.status(404).send("JobType not found");
    } catch (error) {
      logError(error, req, "JobTypeService-getJobType");
      res.status(500).send("Error retrieving jobType");
    }
  }

  public async createJobType(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.jobTypeRepository.createJobType(req, data);
      res.status(201).json({ data: created, message: "JobType created successfully" });
    } catch (error) {
      logError(error, req, "JobTypeService-createJobType");
      res.status(500).send("JobType creation failed");
    }
  }

  public async updateJobType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.jobTypeRepository.updateJobType(req, id, data);
      if (updated) res.json({ data: updated, message: "JobType updated successfully" });
      else res.status(404).send("JobType not found");
    } catch (error) {
      logError(error, req, "JobTypeService-updateJobType");
      res.status(500).send("JobType update failed");
    }
  }

  public async deleteJobType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.jobTypeRepository.deleteJobType(req, id);
      if (deleted) res.json({ data: deleted, message: "JobType deleted successfully" });
      else res.status(404).send("JobType not found");
    } catch (error) {
      logError(error, req, "JobTypeService-deleteJobType");
      res.status(500).send("JobType deletion failed");
    }
  }
}

export default JobTypeService;

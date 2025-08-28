import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import JobRoleRepository from "../database/repositories/jobRole";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class JobRoleService {
  private jobRoleRepository: JobRoleRepository;

  constructor() {
    this.jobRoleRepository = new JobRoleRepository();
  }

  public async getJobRoles(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.jobRoleRepository.getJobRoles(req, pagination, dynamicQuery);
      res.json({
        message: "JobRoles retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "JobRoleService-getJobRoles");
      res.status(500).send("JobRoles retrieval failed");
    }
  }

  public async getJobRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.jobRoleRepository.getJobRoleById(req, id);
      if (item) res.json(item);
      else res.status(404).send("JobRole not found");
    } catch (error) {
      logError(error, req, "JobRoleService-getJobRole");
      res.status(500).send("Error retrieving jobRole");
    }
  }

  public async createJobRole(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.jobRoleRepository.createJobRole(req, data);
      res.status(201).json({ data: created, message: "JobRole created successfully" });
    } catch (error) {
      logError(error, req, "JobRoleService-createJobRole");
      res.status(500).send("JobRole creation failed");
    }
  }

  public async updateJobRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.jobRoleRepository.updateJobRole(req, id, data);
      if (updated) res.json({ data: updated, message: "JobRole updated successfully" });
      else res.status(404).send("JobRole not found");
    } catch (error) {
      logError(error, req, "JobRoleService-updateJobRole");
      res.status(500).send("JobRole update failed");
    }
  }

  public async deleteJobRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.jobRoleRepository.deleteJobRole(req, id);
      if (deleted) res.json({ data: deleted, message: "JobRole deleted successfully" });
      else res.status(404).send("JobRole not found");
    } catch (error) {
      logError(error, req, "JobRoleService-deleteJobRole");
      res.status(500).send("JobRole deletion failed");
    }
  }
}

export default JobRoleService;

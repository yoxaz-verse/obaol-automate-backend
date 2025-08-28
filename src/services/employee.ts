import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import EmployeeRepository from "../database/repositories/employee.";
import { hashPassword } from "../utils/passwordUtils";

class EmployeeService {
  private employeeRepository: EmployeeRepository;

  constructor() {
    this.employeeRepository = new EmployeeRepository();
  }

  public async getEmployees(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.employeeRepository.getEmployees(
        req,
        pagination,
        dynamicQuery
      );
      res.json({
        message: "Employees retrieved successfully",
        data: result,
      });
    } catch (error) {
      logError(error, req, "EmployeeService-getEmployees");
      res.status(500).send("Employees retrieval failed");
    }
  }

  public async getEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.employeeRepository.getEmployeeById(req, id);
      if (item) res.json(item);
      else res.status(404).send("Employee not found");
    } catch (error) {
      logError(error, req, "EmployeeService-getEmployee");
      res.status(500).send("Error retrieving Employee");
    }
  }

  public async createEmployee(req: Request, res: Response) {
    try {
      const data = req.body;
      data.password = await hashPassword(data.password);
      const created = await this.employeeRepository.createEmployee(req, data);
      res
        .status(201)
        .json({ data: created, message: "Employee created successfully" });
    } catch (error) {
      logError(error, req, "EmployeeService-createEmployee");
      res.status(500).send("Employee creation failed");
    }
  }

  public async updateEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.employeeRepository.updateEmployee(
        req,
        id,
        data
      );
      if (updated)
        res.json({ data: updated, message: "Employee updated successfully" });
      else res.status(404).send("Employee not found");
    } catch (error) {
      logError(error, req, "EmployeeService-updateEmployee");
      res.status(500).send("Employee update failed");
    }
  }

  public async deleteEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.employeeRepository.deleteEmployee(req, id);
      if (deleted)
        res.json({ data: deleted, message: "Employee deleted successfully" });
      else res.status(404).send("Employee not found");
    } catch (error) {
      logError(error, req, "EmployeeService-deleteEmployee");
      res.status(500).send("Employee deletion failed");
    }
  }
}

export default EmployeeService;

import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { EmployeeModel } from "../models/employee";

class EmployeeRepository {
  public async getEmployees(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await EmployeeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await EmployeeModel.countDocuments(query);
      return {
        data: docs.map((d) => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "EmployeeRepository-getEmployees");
      throw error;
    }
  }

  public async getEmployeeById(req: Request, id: string) {
    try {
      const doc = await EmployeeModel.findById(id);
      if (!doc) throw new Error("Employee not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "EmployeeRepository-getEmployeeById");
      throw error;
    }
  }

  public async createEmployee(req: Request, data: any) {
    try {
      const created = await EmployeeModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "EmployeeRepository-createEmployee");
      throw error;
    }
  }

  public async updateEmployee(req: Request, id: string, data: any) {
    try {
      const updated = await EmployeeModel.findByIdAndUpdate(id, data, {
        new: true,
      });
      if (!updated) throw new Error("Failed to update Employee");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "EmployeeRepository-updateEmployee");
      throw error;
    }
  }

  public async deleteEmployee(req: Request, id: string) {
    try {
      const deleted = await EmployeeModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete Employee");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "EmployeeRepository-deleteEmployee");
      throw error;
    }
  }
}

export default EmployeeRepository;

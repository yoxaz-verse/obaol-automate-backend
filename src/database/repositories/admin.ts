import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IAdmin, ICreateAdmin, IUpdateAdmin } from "../../interfaces/admin";
import { AdminModel } from "../models/admin";
import { IPagination } from "../../interfaces/pagination";

class AdminRepository {
  public async getAdmins(
    req: Request,
    pagination: IPagination
  ): Promise<{
    data: IAdmin[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const data = await AdminModel.find()
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await AdminModel.countDocuments();
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdmins");
      throw new Error("Admin retrieval failed");
    }
  }

  public async getAdmin(req: Request, id: string): Promise<IAdmin | null> {
    try {
      return await AdminModel.findById(id);
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdmin");
      throw new Error("Admin retrieval failed");
    }
  }

  public async getAdminByEmail(
    req: Request,
    email: string
  ): Promise<IAdmin | null> {
    try {
      return await AdminModel.findOne({ email });
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdminByEmail");
      throw new Error("Admin retrieval failed");
    }
  }

  public async createAdmin(
    req: Request,
    admin: ICreateAdmin
  ): Promise<IAdmin | null> {
    try {
      return await AdminModel.create(admin);
    } catch (error) {
      await logError(error, req, "AdminRepository-createAdmin");
      throw new Error("Admin creation failed");
    }
  }

  public async updateAdmin(
    req: Request,
    id: string,
    admin: Partial<IUpdateAdmin>
  ): Promise<IAdmin | null> {
    try {
      return await AdminModel.findByIdAndUpdate(id, admin, { new: true });
    } catch (error) {
      await logError(error, req, "AdminRepository-updateAdmin");
      throw new Error("Admin update failed");
    }
  }

  public async deleteAdmin(req: Request, id: string): Promise<IAdmin | null> {
    try {
      return await AdminModel.findByIdAndDelete(id);
    } catch (error) {
      await logError(error, req, "AdminRepository-deleteAdmin");
      throw new Error("Admin deletion failed");
    }
  }
}

export default AdminRepository;

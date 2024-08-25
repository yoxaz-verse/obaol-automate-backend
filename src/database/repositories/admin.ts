import { Request } from "express";
import { AdminModel } from "../models/admin";
import { IAdmin, ICreateAdmin, IUpdateAdmin } from "../../interfaces/admin";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class AdminRepository {
  public async getAdmins(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IAdmin[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const admins = await AdminModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await AdminModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: admins,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdmins");
      throw error;
    }
  }

  public async getAdminById(req: Request, id: string): Promise<IAdmin> {
    try {
      const admin = await AdminModel.findById(id).lean();
      if (!admin || admin.isDeleted) {
        throw new Error("Admin not found");
      }
      return admin;
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdminById");
      throw error;
    }
  }

  public async createAdmin(
    req: Request,
    adminData: ICreateAdmin
  ): Promise<IAdmin> {
    try {
      const newAdmin = await AdminModel.create(adminData);
      return newAdmin.toObject();
    } catch (error) {
      await logError(error, req, "AdminRepository-createAdmin");
      throw error;
    }
  }

  public async updateAdmin(
    req: Request,
    id: string,
    adminData: Partial<IUpdateAdmin>
  ): Promise<IAdmin> {
    try {
      const updatedAdmin = await AdminModel.findByIdAndUpdate(id, adminData, {
        new: true,
      });
      if (!updatedAdmin || updatedAdmin.isDeleted) {
        throw new Error("Failed to update admin");
      }
      return updatedAdmin.toObject();
    } catch (error) {
      await logError(error, req, "AdminRepository-updateAdmin");
      throw error;
    }
  }

  public async deleteAdmin(req: Request, id: string): Promise<IAdmin> {
    try {
      const deletedAdmin = await AdminModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      );
      if (!deletedAdmin) {
        throw new Error("Failed to delete admin");
      }
      return deletedAdmin.toObject();
    } catch (error) {
      await logError(error, req, "AdminRepository-deleteAdmin");
      throw error;
    }
  }
}

export default AdminRepository;

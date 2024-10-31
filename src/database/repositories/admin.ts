import { Request } from "express";
import { AdminModel } from "../models/admin";
import { IAdmin, ICreateAdmin, IUpdateAdmin } from "../../interfaces/admin";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class AdminRepository {
  public async getAdminByEmail(
    req: Request,
    email: string
  ): Promise<IAdmin | null> {
    try {
      const admin = await AdminModel.findOne({
        email,
        isDeleted: false,
      }).lean<IAdmin>();
      return admin;
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdminByEmail");
      throw error;
    }
  }

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
      let query: any = { isDeleted: false };
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
      const admins = await AdminModel.find(query)
        .select("-password")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IAdmin[]>();

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
      const admin = await AdminModel.findById(id)
        .select("-password")
        .lean<IAdmin>();
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
      return newAdmin.toObject() as IAdmin;
    } catch (error) {
      await logError(error, req, "AdminRepository-createAdmin");
      throw error;
    }
  }

  public async updateAdmin(
    req: Request,
    id: string,
    adminData: IUpdateAdmin
  ): Promise<IAdmin> {
    try {
      const updatedAdmin = await AdminModel.findByIdAndUpdate(id, adminData, {
        new: true,
      }).lean<IAdmin>();
      if (!updatedAdmin || updatedAdmin.isDeleted) {
        throw new Error("Failed to update admin");
      }
      return updatedAdmin;
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
      ).lean<IAdmin>();
      if (!deletedAdmin) {
        throw new Error("Failed to delete admin");
      }
      return deletedAdmin;
    } catch (error) {
      await logError(error, req, "AdminRepository-deleteAdmin");
      throw error;
    }
  }
}

export default AdminRepository;

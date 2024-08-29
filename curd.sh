#!/bin/bash

# Create model
cat <<EOT > src/database/models/admin.ts
import mongoose from "mongoose";

interface IAdmin extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isSuperAdmin: boolean;
  name: string;
  password: string;
}

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean,  default: false },
    name: { type: String, required: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

export const AdminModel = mongoose.model<IAdmin>("Admin", AdminSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/admin.ts
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
EOT

# Create service
cat <<EOT > src/services/admin.ts
import { Request, Response } from "express";
import AdminRepository from "../database/repositories/admin";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class AdminService {
  private adminRepository: AdminRepository;

  constructor() {
    this.adminRepository = new AdminRepository();
  }

  public async getAdmins(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const admins = await this.adminRepository.getAdmins(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(admins, "Admins retrieved successfully");
    } catch (error) {
      await logError(error, req, "AdminService-getAdmins");
      res.sendError(error, "Admins retrieval failed");
    }
  }

  public async getAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const admin = await this.adminRepository.getAdminById(req, id);
      res.sendFormatted(admin, "Admin retrieved successfully");
    } catch (error) {
      await logError(error, req, "AdminService-getAdmin");
      res.sendError(error, "Admin retrieval failed");
    }
  }

  public async createAdmin(req: Request, res: Response) {
    try {
      const adminData = req.body;
      const newAdmin = await this.adminRepository.createAdmin(req, adminData);
      res.sendFormatted(newAdmin, "Admin created successfully", 201);
    } catch (error) {
      await logError(error, req, "AdminService-createAdmin");
      res.sendError(error, "Admin creation failed");
    }
  }

  public async updateAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminData = req.body;
      const updatedAdmin = await this.adminRepository.updateAdmin(
        req,
        id,
        adminData
      );
      res.sendFormatted(updatedAdmin, "Admin updated successfully");
    } catch (error) {
      await logError(error, req, "AdminService-updateAdmin");
      res.sendError(error, "Admin update failed");
    }
  }

  public async deleteAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedAdmin = await this.adminRepository.deleteAdmin(req, id);
      res.sendFormatted(deletedAdmin, "Admin deleted successfully");
    } catch (error) {
      await logError(error, req, "AdminService-deleteAdmin");
      res.sendError(error, "Admin deletion failed");
    }
  }
}

export default AdminService;
EOT

# Create middleware
cat <<EOT > src/middlewares/admin.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class AdminMiddleware {
  public async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;
      if (!email || !name || !password) {
        res.sendError(
          "ValidationError: Email, Name, and Password must be provided",
          "Email, Name, and Password must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-AdminCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;
      if (!email && !name && !password) {
        res.sendError(
          "ValidationError: Email, Name, and Password must be provided",
          "Email, Name, and Password must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-AdminUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-AdminDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-AdminGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default AdminMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/admin.ts
export interface IAdmin {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isSuperAdmin: boolean;
  name: string;
  password: string;
}

export interface ICreateAdmin {
  email: string;
  isActive?: boolean; 
  isDeleted?: boolean;
  isSuperAdmin?: boolean;
  name: string;
  password: string;
}

export interface IUpdateAdmin {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isSuperAdmin?: boolean;
  name?: string;
  password?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/adminRoute.ts
import { Router } from "express";
import AdminService from "../services/admin";
import AdminMiddleware from "../middlewares/admin";

const router = Router();
const adminService = new AdminService();
const adminMiddleware = new AdminMiddleware();

router.get(
  "/",
  adminService.getAdmins.bind(adminService)


);
router.get(
  "/:id",
  adminMiddleware.getAdmin.bind(adminMiddleware),
  adminService.getAdmin.bind(adminService)
);
router.post(
  "/",
  adminMiddleware.createAdmin.bind(adminMiddleware),
  adminService.createAdmin.bind(adminService)
);
router.patch(
  "/:id",
  adminMiddleware.updateAdmin.bind(adminMiddleware),
  adminService.updateAdmin.bind(adminService)
);
router.delete(
  "/:id",
  adminMiddleware.deleteAdmin.bind(adminMiddleware),
  adminService.deleteAdmin.bind(adminService)
);

export default router;
EOT

echo "Admin module generated successfully."
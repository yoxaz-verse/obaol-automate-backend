#!/bin/bash

# Constants
INTERFACE_PATH="src/interfaces/admin.ts"
MODEL_PATH="src/database/models/admin.ts"
REPOSITORY_PATH="src/database/repositories/admin.ts"
SERVICE_PATH="src/services/admin.ts"
MIDDLEWARE_PATH="src/middlewares/admin.ts"
ROUTE_PATH="src/routes/admin.ts"

# Create Interfaces
cat > $INTERFACE_PATH <<EOL
export interface IAdmin {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isSuperAdmin: boolean;
  name: string;
  password: string;
  refreshToken?: string;
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
  refreshToken?: string;
}
EOL

echo "Interfaces created at $INTERFACE_PATH"

# Create Model
cat > $MODEL_PATH <<EOL
import mongoose from "mongoose";

interface IAdmin extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  refreshToken?: string;
}

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    refreshToken: { type: String },
  },
  {
    timestamps: true,
  }
);

export const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);
EOL

echo "Model created at $MODEL_PATH"

# Create Repository
cat > $REPOSITORY_PATH <<EOL
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
EOL

echo "Repository created at $REPOSITORY_PATH"

# Create Middleware
cat > $MIDDLEWARE_PATH <<EOL
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";
import { verifyToken } from "../helpers/encrypt";
import { CustomRequest } from "../interfaces/customRequest";

class AdminMiddleware {
  public async validateAdmin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1];
      if (!accessToken) {
        return res.status(401).send({ message: "Access token is missing or invalid" });
      }
      const decoded = verifyToken(accessToken) as { id: string; email: string; role: string; };
      if (!decoded || decoded.role !== "admin") {
        return res.status(403).send({ message: "Access forbidden: admins only" });
      }
      req.admin = decoded;
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateAdmin");
      res.status(500).send({ message: "An unexpected error occurred" });
    }
  }

  public async validateSuperAdmin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1];
      if (!accessToken) {
        return res.status(401).send({ message: "Access token is missing or invalid" });
      }
      const decoded = verifyToken(accessToken) as { id: string; email: string; role: string; };
      if (!decoded || decoded.role !== "superAdmin") {
        return res.status(403).send({ message: "Access forbidden: superadmins only" });
      }
      req.admin = decoded;
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateSuperAdmin");
      res.status(500).send({ message: "An unexpected error occurred" });
    }
  }

  public async adminLogin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).send({ message: "Email and password are required" });
      }
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-adminLogin");
      res.status(500).send({ message: "An unexpected error occurred" });
    }
  }

  public async adminLogout(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1];
      if (!accessToken) {
        return res.status(401).send({ message: "Access token is missing or invalid" });
      }
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-adminLogout");
      res.status(500).send({ message: "An unexpected error occurred" });
    }
  }

  public async refreshToken(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const refreshToken = req.headers.authorization?.split(" ")[1];
      if (!refreshToken) {
        return res.status(401).send({ message: "Refresh token is missing or invalid" });
      }
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-refreshToken");
      res.status(500).send({ message: "An unexpected error occurred" });
    }
  }
}

export default AdminMiddleware;
EOL

echo "Middleware created at $MIDDLEWARE_PATH"

# Create Routes
cat > $ROUTE_PATH <<EOL
import { Router } from "express";
import AdminService from "../services/admin";
import AdminMiddleware from "../middlewares/admin";

const router = Router();
const adminService = new AdminService();
const adminMiddleware = new AdminMiddleware();

router.get(
  "/",
  adminMiddleware.validateSuperAdmin.bind(adminMiddleware),
  adminService.getAdmins.bind(adminService)
);

router.get(
  "/:id",
  adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware),
  adminMiddleware.getAdmin.bind(adminMiddleware),
  adminService.getAdmin.bind(adminService)
);

router.patch(
  "/:id",
  adminMiddleware.validateSuperAdmin.bind(adminMiddleware),
  adminMiddleware.updateAdmin.bind(adminMiddleware),
  adminService.updateAdmin.bind(adminService)
);

router.delete(
  "/:id",
  adminMiddleware.validateSuperAdmin.bind(adminMiddleware),
  adminMiddleware.deleteAdmin.bind(adminMiddleware),
  adminService.deleteAdmin.bind(adminService)
);

router.post(
  "/",
  adminMiddleware.validateSuperAdmin.bind(adminMiddleware),
  adminMiddleware.createAdmin.bind(adminMiddleware),
  adminService.createAdmin.bind(adminService)
);

router.post(
  "/login",
  adminMiddleware.adminLogin.bind(adminMiddleware),
  adminService.adminLogin.bind(adminService)
);

router.post(
  "/logout",
  adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware),
  adminService.adminLogout.bind(adminService)
);

router.post(
  "/refresh-token",
  adminMiddleware.refreshToken.bind(adminMiddleware),
  adminService.adminRefreshToken.bind(adminService)
);

export default router;
EOL

echo "Routes created at $ROUTE_PATH"

echo "Admin module setup is complete!"

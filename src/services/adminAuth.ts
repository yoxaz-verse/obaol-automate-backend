import { Request, Response } from "express";
import AdminRepository from "../database/repositories/admin";
import { logError } from "../utils/errorLogger";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../config";

class AdminAuthService {
  private adminRepository: AdminRepository;

  constructor() {
    this.adminRepository = new AdminRepository();
  }

  public async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const admin = await this.adminRepository.getAdminByEmail(req, email);

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        res.sendError("Invalid credentials", "Invalid email or password", 401);
        return;
      }

      const accessToken = jwt.sign(
        { id: admin._id, email: admin.email },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      const refreshToken = jwt.sign(
        { id: admin._id, email: admin.email },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      await this.adminRepository.updateAdmin(req, admin._id, {
        refreshToken,
      });

      res.sendFormatted(
        { accessToken, refreshToken },
        "Login successful"
      );
    } catch (error) {
      await logError(error, req, "AdminAuthService-login");
      res.sendError(error, "Login failed");
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        res.sendError("Admin ID not found", "Unauthorized", 401);
        return;
      }
      await this.adminRepository.updateAdmin(req, adminId, {
        refreshToken: null,
      });
      res.sendFormatted({}, "Logout successful");
    } catch (error) {
      await logError(error, req, "AdminAuthService-logout");
      res.sendError(error, "Logout failed");
    }
  }

  public async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.sendError("Refresh token not provided", "Refresh token required", 400);
        return;
      }

      const decoded: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const admin = await this.adminRepository.getAdminById(req, decoded.id);

      if (admin.refreshToken !== refreshToken) {
        res.sendError("Invalid refresh token", "Invalid refresh token", 401);
        return;
      }

      const newAccessToken = jwt.sign(
        { id: admin._id, email: admin.email },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.sendFormatted({ accessToken: newAccessToken }, "Token refreshed");
    } catch (error) {
      await logError(error, req, "AdminAuthService-refreshToken");
      res.sendError(error, "Token refresh failed");
    }
  }
}

export default AdminAuthService;

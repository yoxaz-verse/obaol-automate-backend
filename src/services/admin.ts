import { Request, Response } from "express";
import AdminRepository from "../database/repositories/admin";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { serialize } from "cookie";
import { generateJWTToken } from "./../utils/tokenUtils";
import { comparePasswords, hashPassword } from "./../utils/passwordUtils";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class AdminService {
  public async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      console.log("Login Attempt:", req.body);

      const admin = await this.adminRepository.getAdminByEmail(req, email);
      console.log("Admin Found:", admin);

      if (!admin) {
        res.status(401).json({
          success: false,
          message: "Authentication failed: Invalid email",
        });
        return;
      }

      // Compare passwords
      const isMatch = await comparePasswords(password, admin.password);
      console.log("Password Match Result:", isMatch);

      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: "Authentication failed: Invalid password",
        });
        return;
      }

      // Generate JWT token
      const token = generateJWTToken(admin); // Ensure this function signs the token correctly

      // Set the token as an HTTP-Only cookie
      res.cookie("token", token, {
        httpOnly: true, // Prevents JavaScript access
        secure: process.env.NODE_ENV === "production", // Ensures cookie is sent over HTTPS
        sameSite: "strict", // Mitigates CSRF
        maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
      });

      // Respond with a success message without the token
      res.status(200).json({
        success: true,
        message: "Login successful",
      });
    } catch (error) {
      await logError(error, req, "AdminService-login");
      res.status(500).json({
        success: false,
        message: "Login failed: Internal server error",
      });
    }
  }

  public async getCurrentUser(req: Request, res: Response) {
    try {
      const user = req.user; // Attached by authenticateToken middleware

      // Fetch admin details if needed
      if (!user) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve user information",
        });
      }
      const admin = await this.adminRepository.getAdminById(req, user.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        user: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          // Add other necessary fields
        },
      });
    } catch (error) {
      await logError(error, req, "AdminService-getCurrentUser");
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user information",
      });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      await logError(error, req, "AdminService-logout");
      res.status(500).json({
        success: false,
        message: "Logout failed: Internal server error",
      });
    }
  }

  private adminRepository: AdminRepository;

  constructor() {
    this.adminRepository = new AdminRepository();
  }

  public async getAdmins(req: Request, res: Response) {
    try {
      const { page, limit, ...filters } = req.query;
      const pagination = paginationHandler(req);
      const dynamicQuery = buildDynamicQuery(filters);
      const admins = await this.adminRepository.getAdmins(
        req,
        pagination,
        dynamicQuery
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
      res.json(admin);
    } catch (error) {
      await logError(error, req, "AdminService-getAdmin");
      res.sendError(error, "Admin retrieval failed");
    }
  }

  public async createAdmin(req: Request, res: Response) {
    try {
      const adminData = req.body;
      // Hash password
      adminData.password = await hashPassword(adminData.password);

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
      // Hash password
      if (adminData.password) {
        adminData.password = await hashPassword(adminData.password);
      }
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

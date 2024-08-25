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

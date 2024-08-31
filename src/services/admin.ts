import { Request, Response, NextFunction } from "express";
import AdminRepository from "../database/repositories/admin";
import { logError } from "../utils/errorLogger";
import { IAdmin } from "../interfaces/admin";

class AdminService {
    private adminRepository: AdminRepository;

    constructor() {
        this.adminRepository = new AdminRepository();
    }

    // Get all admins
    public async getAdmins(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const pagination = {
                limit: Number(req.query.limit) || 10,
                page: Number(req.query.page) || 1,
            };

            const result = await this.adminRepository.getAdmins(req, pagination);
            res.status(200).send(result);
        } catch (error) {
            await logError(error, req, "AdminService-getAdmins");
            res.status(500).send({
                message: "Failed to retrieve admins",
                error: error.message,
            });
        }
    }

    // Get a single admin by ID
    public async getAdmin(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const admin = await this.adminRepository.getAdmin(req, req.params.id);
            if (!admin) {
                return res.status(404).send({ message: "Admin not found" });
            }
            res.status(200).send(admin);
        } catch (error) {
            await logError(error, req, "AdminService-getAdmin");
            res.status(500).send({
                message: "Failed to retrieve admin",
                error: error.message,
            });
        }
    }

    // Create a new admin
    public async createAdmin(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const adminData = req.body as IAdmin;
            const admin = await this.adminRepository.createAdmin(req, adminData);
            if (!admin) {
                return res.status(400).send({ message: "Failed to create admin" });
            }
            res.status(201).send(admin);
        } catch (error) {
            await logError(error, req, "AdminService-createAdmin");
            res.status(500).send({
                message: "Failed to create admin",
                error: error.message,
            });
        }
    }

    // Update an existing admin
    public async updateAdmin(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const adminData = req.body;
            const admin = await this.adminRepository.updateAdmin(req, req.params.id, adminData);
            if (!admin) {
                return res.status(400).send({ message: "Failed to update admin" });
            }
            res.status(200).send(admin);
        } catch (error) {
            await logError(error, req, "AdminService-updateAdmin");
            res.status(500).send({
                message: "Failed to update admin",
                error: error.message,
            });
        }
    }

    // Delete an admin
    public async deleteAdmin(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const admin = await this.adminRepository.deleteAdmin(req, req.params.id);
            if (!admin) {
                return res.status(400).send({ message: "Failed to delete admin" });
            }
            res.status(200).send({ message: "Admin deleted successfully" });
        } catch (error) {
            await logError(error, req, "AdminService-deleteAdmin");
            res.status(500).send({
                message: "Failed to delete admin",
                error: error.message,
            });
        }
    }

    // Admin login
    public async adminLogin(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { email, password } = req.body;

            const admin = await this.adminRepository.getAdminByEmail(req, email);
            if (!admin || admin.password !== password) {
                return res.status(401).send({ message: "Invalid email or password" });
            }

            // Assume createToken is a function that generates a JWT token
            const token = createToken({ id: admin._id, email: admin.email, role: "admin" });
            res.status(200).send({ token });
        } catch (error) {
            await logError(error, req, "AdminService-adminLogin");
            res.status(500).send({
                message: "Failed to login admin",
                error: error.message,
            });
        }
    }

    // Admin logout
    public async adminLogout(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { id } = req.admin || {};
            if (!id) {
                return res.status(400).send({ message: "Invalid admin ID" });
            }

            await this.adminRepository.clearRefreshToken(req, id);
            res.status(200).send({ message: "Admin logged out successfully" });
        } catch (error) {
            await logError(error, req, "AdminService-adminLogout");
            res.status(500).send({
                message: "Failed to logout admin",
                error: error.message,
            });
        }
    }

    // Refresh token
    public async adminRefreshToken(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { refreshToken } = req.body;

            const admin = await this.adminRepository.getAdminByRefreshToken(req, refreshToken);
            if (!admin) {
                return res.status(401).send({ message: "Invalid refresh token" });
            }

            const newToken = createToken({ id: admin._id, email: admin.email, role: "admin" });
            res.status(200).send({ token: newToken });
        } catch (error) {
            await logError(error, req, "AdminService-adminRefreshToken");
            res.status(500).send({
                message: "Failed to refresh token",
                error: error.message,
            });
        }
    }
}

export default AdminService;

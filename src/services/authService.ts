import { Request, Response } from "express";
import { AdminModel } from "../database/models/admin";
import { ProjectManagerModel } from "../database/models/projectManager";
import { CustomerModel } from "../database/models/customer";
import { EmployeeModel } from "../database/models/employee";
import { AssociateModel as AgentModel } from "../database/models/associate";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import { comparePasswords, hashPassword } from "../utils/passwordUtils";
import { generateJWTToken } from "../utils/tokenUtils";
import verificationService from "./verification.service";
import logger from "../utils/apiLogger";

export const authenticateUser = async (req: Request, res: Response) => {
    // ... (existing code, unchanged)
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        let user: any = null;
        let finalRole = role;

        const models: Record<string, any> = {
            "Admin": AdminModel,
            "ProjectManager": ProjectManagerModel,
            "Customer": CustomerModel,
            "Employee": EmployeeModel,
            "Associate": AgentModel,
            "ActivityManager": InventoryManagerModel,
            "Worker": EmployeeModel
        };

        if (role && models[role]) {
            user = await models[role].findOne({ email });
        } else {
            user = await AdminModel.findOne({ email });
            if (user) finalRole = "Admin";
        }

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (user.isDeleted) {
            return res.status(401).json({ message: "Account has been deleted" });
        }

        if (user.isActive === false) {
            return res.status(401).json({ message: "Account is inactive. Please contact support." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const userForToken = {
            ...user.toObject(),
            role: finalRole,
            // Ensure associateCompany is included if present (for AssociateCompany scope)
            associateCompany: user.associateCompany
        };
        const token = generateJWTToken(userForToken);

        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: finalRole
            }
        });

    } catch (error: any) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email, role } = req.body;
        logger.info(`🔑 Password reset requested for: ${email} with role: ${role}`);
        if (!email || !role) return res.status(400).json({ message: "Email and role are required" });

        const models: Record<string, any> = {
            "Admin": AdminModel,
            "ProjectManager": ProjectManagerModel,
            "Customer": CustomerModel,
            "Employee": EmployeeModel,
            "Associate": AgentModel,
            "ActivityManager": InventoryManagerModel
        };

        const model = models[role];
        if (!model) return res.status(400).json({ message: "Invalid role" });

        const user = await model.findOne({ email });
        if (!user) {
            logger.warn(`❌ Password reset failed: User NOT found for email: ${email}`);
            return res.status(404).json({ message: "User not found" });
        }

        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
        const userAgent = req.headers["user-agent"] || "unknown";

        await verificationService.initiateVerification(
            user._id.toString(),
            role,
            "email",
            ip.toString(),
            userAgent,
            email
        );

        res.json({ success: true, message: "OTP sent to your email" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const completePasswordReset = async (req: Request, res: Response) => {
    try {
        const { email, role, code, newPassword } = req.body;
        if (!email || !role || !code || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const models: Record<string, any> = {
            "Admin": AdminModel,
            "ProjectManager": ProjectManagerModel,
            "Customer": CustomerModel,
            "Employee": EmployeeModel,
            "Associate": AgentModel,
            "ActivityManager": InventoryManagerModel
        };

        const model = models[role];
        if (!model) return res.status(400).json({ message: "Invalid role" });

        const user = await model.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        await verificationService.verify(user._id.toString(), role, code, "email");

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: "Password reset successful" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const logoutUser = async (req: Request, res: Response) => {
    res.clearCookie("auth_token");
    res.json({ success: true, message: "Logged out successfully" });
};

/**
 * Register a new Associate
 * POST /auth/register
 */
export const registerAssociate = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasUpperCase || !hasNumber) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least one uppercase letter and one number"
            });
        }

        // Check email uniqueness across all models (prevent email enumeration with generic error)
        const trimmedEmail = email.trim().toLowerCase();

        const existingAssociate = await AgentModel.findOne({ email: trimmedEmail });
        const existingAdmin = await AdminModel.findOne({ email: trimmedEmail });
        const existingEmployee = await EmployeeModel.findOne({ email: trimmedEmail });
        const existingCustomer = await CustomerModel.findOne({ email: trimmedEmail });

        if (existingAssociate || existingAdmin || existingEmployee || existingCustomer) {
            return res.status(400).json({
                success: false,
                message: "Registration failed. Please try again." // Generic error - no email enumeration
            });
        }

        // Create Associate with minimal required fields
        const newAssociate = await AgentModel.create({
            name: name.trim(),
            email: trimmedEmail,
            password: password, // Plugin will hash this on save/create
            role: "Associate",
            isActive: true,
        });

        // Return success (no auto-login for security)
        res.status(201).json({
            success: true,
            message: "Registration successful. Please log in.",
            associate: {
                id: newAssociate._id,
                name: newAssociate.name,
                email: newAssociate.email,
            }
        });

    } catch (error: any) {
        console.error("Registration error:", error);

        // Handle duplicate key error (email already exists)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Registration failed. Please try again."
            });
        }

        res.status(500).json({
            success: false,
            message: "Registration failed. Please try again later."
        });
    }
};

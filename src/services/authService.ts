// src/services/authService.ts

import jwt, { SignOptions, Secret } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { AdminModel } from "../database/models/admin";
import { CustomerModel } from "../database/models/customer";
import {
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
  NODE_ENV,
} from "../config";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import { ProjectManagerModel } from "../database/models/projectManager";
import { AssociateModel } from "../database/models/associate";
interface UserModel {
  findOne: (query: object) => Promise<any>;
}

const getUserModel = (role: string): UserModel | null => {
  switch (role) {
    case "Admin":
      return AdminModel;
    case "Customer":
      return CustomerModel;
    case "InventoryManager":
      return InventoryManagerModel;
    case "ProjectManager":
      return ProjectManagerModel;

    case "Associate":
      return AssociateModel;
    default:
      return null;
  }
};

export const authenticateUser = async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  try {
    const userModel = getUserModel(role);

    if (!userModel) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid email or password",
      });
    }

    // Generate JWT token with role
    const payload = {
      id: user._id,
      email: user.email,
      role: role, // Include role in the payload
    };

    const token = jwt.sign(
      payload,
      JWT_SECRET as Secret,
      {
        expiresIn: "1d",
      } as SignOptions
    );
    const refreshToken = jwt.sign(
      payload,
      JWT_REFRESH_SECRET as Secret,
      {
        expiresIn: JWT_REFRESH_EXPIRE, // e.g., "10d"
      } as SignOptions
    );

    // Set the token as an HTTP-Only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: NODE_ENV === "production", // Set to true in production
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    });

    // Set the Refresh Token as an HTTP-Only cookie (if using)
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    });
    res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed: Internal server error",
    });
  }
};

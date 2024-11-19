import mongoose from "mongoose";

export interface IProjectManager {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  role: string; // Role of the project manager
}

export interface ICreateProjectManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
}

export interface IUpdateProjectManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  isActive?: boolean;
}

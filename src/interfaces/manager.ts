import mongoose from "mongoose";

export interface IManager {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  fileId?: string; // Unique identifier for the uploaded file
  fileURL?: string; // URL to access the uploaded file
  role: string; // Role of the manager
}

export interface ICreateManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
  fileId: string;
  fileURL: string;
}

export interface IUpdateManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  fileId?: string;
  fileURL?: string;
  isActive?: boolean;
}

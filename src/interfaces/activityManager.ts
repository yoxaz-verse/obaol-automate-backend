import mongoose from "mongoose";

export interface IActivityManager {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  role: string; // Assign default role
}

export interface ICreateActivityManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
}

export interface IUpdateActivityManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  isActive?: boolean;
}

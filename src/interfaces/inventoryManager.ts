import mongoose from "mongoose";

export interface IInventoryManager {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  role: string; // Assign default role
}

export interface ICreateInventoryManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
}

export interface IUpdateInventoryManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  isActive?: boolean;
}

import { IAdmin } from "./admin";
import mongoose from "mongoose";

export interface IManager {
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name: string;
  password: string;
  admin?: mongoose.Schema.Types.ObjectId | IAdmin; // Adjust this line
}

export interface ICreateManager {
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name: string;
  password: string;
  admin: string; // Linking to Admin
}

export interface IUpdateManager {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name?: string;
  password?: string;
  admin?: string; // Linking to Admin
}

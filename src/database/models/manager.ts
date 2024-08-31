import mongoose from "mongoose";
import { AdminModel } from "./admin";

interface IManager extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId;  // Link to Admin
}

const ManagerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }  // Linking to Admin
  },
  { timestamps: true }
);

export const ManagerModel = mongoose.model<IManager>("Manager", ManagerSchema);

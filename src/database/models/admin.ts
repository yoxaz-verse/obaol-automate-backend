import mongoose from "mongoose";

interface IAdmin extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  refreshToken?: string;
}

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    refreshToken: { type: String },
  },
  {
    timestamps: true,
  }
);

export const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);

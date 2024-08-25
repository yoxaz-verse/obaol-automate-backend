import mongoose from "mongoose";

interface IAdmin extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isSuperAdmin: boolean;
  name: string;
  password: string;
}

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

export const AdminModel = mongoose.model<IAdmin>("Admin", AdminSchema);

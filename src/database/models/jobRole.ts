import mongoose from "mongoose";

interface IJobRole extends mongoose.Document {
  name?: string;
  description?: string;
  isDeleted: boolean;
}

const JobRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const JobRoleModel = mongoose.model<IJobRole>("JobRole", JobRoleSchema);

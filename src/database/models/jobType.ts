import mongoose from "mongoose";

interface IJobType extends mongoose.Document {
  name?: string;
  description?: string;
  isDeleted: boolean;
}

const JobTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const JobTypeModel = mongoose.model<IJobType>("JobType", JobTypeSchema);

import mongoose from "mongoose";

interface IProjectStatus extends mongoose.Document {
  _id: string;
  name: string;
  priority?: number;
}

const ProjectStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProjectStatusModel = mongoose.model<IProjectStatus>(
  "ProjectStatus",
  ProjectStatusSchema
);

import mongoose from "mongoose";

interface IProjectType extends mongoose.Document {
  name: string;
}

const ProjectTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const ProjectTypeModel = mongoose.model<IProjectType>("ProjectType", ProjectTypeSchema);

import mongoose from "mongoose";
import { IProjectManager } from "../../interfaces/projectManager";
import { passwordPlugin } from "./plugins/password.plugin";

interface IProjectManagerDoc extends Omit<IProjectManager, "_id">, mongoose.Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const ProjectManagerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    role: { type: String, default: "projectManager" },
  },
  { timestamps: true }
);

ProjectManagerSchema.plugin(passwordPlugin);

export const ProjectManagerModel = mongoose.model<IProjectManagerDoc>(
  "ProjectManager",
  ProjectManagerSchema
);

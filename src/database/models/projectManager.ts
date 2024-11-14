import mongoose from "mongoose";
import { IProjectManager } from "../../interfaces/projectManager";

const ProjectManagerSchema = new mongoose.Schema<IProjectManager>(
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
    }, // Linking to Admin
    role: { type: String, default: "projectManager" }, // Assign default role
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
/*
import bcrypt from "bcrypt";

ProjectManagerSchema.pre<IProjectManager>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
*/

export const ProjectManagerModel = mongoose.model<IProjectManager>(
  "ProjectManager",
  ProjectManagerSchema
);

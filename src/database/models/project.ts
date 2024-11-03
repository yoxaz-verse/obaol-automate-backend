import mongoose from "mongoose";
import { IProject } from "../interfaces/project";

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    customId: { type: String },
    prevCustomId: { type: String },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectStatus",
      required: true,
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectType",
      required: true,
    },
    task: { type: String, required: true },
    orderNumber: { type: String, required: true },
    assignmentDate: { type: Date, required: true },
    schedaRadioDate: { type: Date, required: true },
    statusHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ProjectStatus" },
    ],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Custom ID generator
ProjectSchema.pre<IProject>("validate", function (next) {
  if (!this.customId && this.isNew) {
    const location = this.get("location");
    if (location) {
      const customId = `${location.nation
        .slice(0, 2)
        .toUpperCase()}${location.city
        .slice(0, 2)
        .toUpperCase()}${location.region
        .slice(0, 2)
        .toUpperCase()}${location.province.slice(0, 2).toUpperCase()}`;
      this.customId = customId;
    }
  }
  next();
});

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);

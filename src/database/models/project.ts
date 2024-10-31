import mongoose from "mongoose";
import { CustomerModel } from "./customer";
import { AdminModel } from "./admin";
import { ManagerModel } from "./manager";
import { ProjectStatusModel } from "./projectStatus";

interface IProject extends mongoose.Document {
  title: string;
  description: string;
  customId: string;
  budget: string;
  prevCustomId: string;
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  admin: mongoose.Schema.Types.ObjectId | typeof AdminModel;
  manager: mongoose.Schema.Types.ObjectId | typeof ManagerModel;
  status: mongoose.Schema.Types.ObjectId | typeof ProjectStatusModel;
  statusHistory: mongoose.Schema.Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
  // Add any additional fields if necessary
}

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    customId: { type: String, required: true, unique: true },
    budget: { type: String, required: true, unique: true },
    prevCustomId: { type: String, unique: true },
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
    statusHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ProjectStatus" },
    ],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    // Add any additional fields if necessary
  },
  { timestamps: true }
);

// Custom ID generator
ProjectSchema.pre<IProject>("validate", function (next) {
  if (!this.customId && this.isNew) {
    const location = this.get("location"); // Ensure 'location' is handled appropriately
    if (location) {
      const customId = `${location.nation.slice(0, 2).toUpperCase()}${location.city.slice(0, 2).toUpperCase()}${location.region.slice(0, 2).toUpperCase()}${location.province.slice(0, 2).toUpperCase()}`;
      this.customId = customId;
    }
  }
  next();
});

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);

import { IProject } from "../../interfaces/project";
import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    customId: { type: String, unique: true }, // Ensure uniqueness
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
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectManager",
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
ProjectSchema.pre<IProject>("save", async function (next) {
  if (!this.customId && this.isNew) {
    await this.populate("customer type");
    const customer = this.customer as any;
    const type = this.type as any;

    if (customer?.name && type?.name) {
      this.customId = `${customer.name.toUpperCase()}-${type?.name.toUpperCase()}-${Date.now()}`;
    } else {
      console.warn("Incomplete data for custom ID generation.");
      this.customId = `${this.task.slice(0, 5).toUpperCase()}-${Date.now()}`;
    }
  }
  next();
});

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);

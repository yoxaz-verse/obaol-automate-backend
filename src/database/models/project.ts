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
      const key = `${customer.name.toUpperCase()}-${type.name.toUpperCase()}`; // Create a unique key

      // Find or create a sequence value for the key
      const counter = await ProjectCounterModel.findOneAndUpdate(
        { key },
        { $inc: { sequenceValue: 1 } }, // Increment the sequence value
        { new: true, upsert: true } // Create if it doesn't exist
      );

      const sequenceNumber = counter.sequenceValue.toString().padStart(5, "0"); // Pad sequence to 5 digits
      this.customId = `${key}-${sequenceNumber}`; // Construct the customId
    } else if (this.task) {
      this.customId = `${this.task.slice(0, 5).toUpperCase()}-${Date.now()}`;
    } else {
      console.warn("Incomplete data for custom ID generation.");
      this.customId = `${Date.now()}`;
    }
  }
  next();
});

const ProjectCounterSchema = new mongoose.Schema({
  key: { type: String, unique: true }, // Unique key combining customer and type
  sequenceValue: { type: Number, default: 0 }, // Incrementing sequence number
});

export const ProjectCounterModel = mongoose.model(
  "ProjectCounter",
  ProjectCounterSchema
);

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);

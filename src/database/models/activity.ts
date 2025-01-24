import mongoose from "mongoose";
import { ProjectModel } from "./project";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { CustomerModel } from "./customer";
import { ActivityStatusModel } from "./activityStatus";
import { ActivityTypeModel } from "./activityType";
import { ActivityManagerModel } from "./activityManager";
import { boolean } from "joi";

interface IActivity extends mongoose.Document {
  _id: string;
  title: string;
  description: string;
  project: mongoose.Schema.Types.ObjectId | typeof ProjectModel;
  forecastDate?: Date;
  actualDate?: Date;
  targetOperationDate?: Date;
  targetFinanceDate?: Date;
  activityManager: mongoose.Schema.Types.ObjectId | typeof ActivityManagerModel;
  worker: Array<mongoose.Schema.Types.ObjectId | typeof WorkerModel>;
  updatedBy: string; // Role of the user who last updated the activity
  statusHistory: Array<
    mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel
  >;
  allowTimesheets: Boolean;
  status: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel;
  previousStatus?: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel; // Previous status (for suspension/blocking)
  rejectionReason: string[]; // List of reasons for rejection
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  type: mongoose.Schema.Types.ObjectId | typeof ActivityTypeModel;
  hoursSpent: number; // Hours spent on the activity
  isDeleted?: boolean;
}

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },

    allowTimesheets: { type: Boolean, default: true },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    forecastDate: { type: Date },
    actualDate: { type: Date },
    targetFinanceDate: { type: Date },
    targetOperationDate: { type: Date },
    worker: [{ type: mongoose.Schema.Types.ObjectId, ref: "Worker" }],
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityType",
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
      enum: ["Worker", "ActivityManager", "ProjectManager", "Admin"],
    },
    hoursSpent: { type: Number },
    statusHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ActivityStatus" },
    ],
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityStatus",
      required: true,
    },
    previousStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityStatus",
    }, // For suspension/blocking
    rejectionReason: [{ type: String, default: "" }],

    activityManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityManager",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Custom ID generator
ActivitySchema.pre<IActivity>("save", async function (next) {
  if (!this.title && this.isNew) {
    await this.populate("project type");

    const project = this.project as any;
    const type = this.type as any;

    if (project?.customId && type?.name) {
      const projectTypeKey = `${project.customId}-${type.name}`;

      // Find or create a sequence value for the projectTypeKey
      const counter = await ActivityCounterModel.findOneAndUpdate(
        { projectTypeKey },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true } // Create if doesn't exist
      );

      const sequenceNumber = counter.sequenceValue.toString().padStart(4, "0"); // Pad to 4 digits
      this.title = `${project.customId.toUpperCase()}-${type.name.toUpperCase()}-${sequenceNumber}`;
    } else {
      console.warn("Incomplete data for custom ID generation.");
      this.title = `${Date.now()}`;
    }
  }
  next();
});

const ActivityCounterSchema = new mongoose.Schema({
  projectTypeKey: { type: String, unique: true }, // Unique key: Project.customId + Activity.type
  sequenceValue: { type: Number, default: 0 },
});

export const ActivityCounterModel = mongoose.model(
  "ActivityCounter",
  ActivityCounterSchema

  
);

export const ActivityModel = mongoose.model<IActivity>(
  "Activity",
  ActivitySchema
);

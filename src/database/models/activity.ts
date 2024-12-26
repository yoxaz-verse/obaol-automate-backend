import mongoose from "mongoose";
import { ProjectModel } from "./project";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { CustomerModel } from "./customer";
import { ActivityStatusModel } from "./activityStatus";
import { ActivityTypeModel } from "./activityType";
import { ActivityManagerModel } from "./activityManager";

interface IActivity extends mongoose.Document {
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
}

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

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
  },
  { timestamps: true }
);

// Custom ID generator
ActivitySchema.pre<IActivity>("save", async function (next) {
  if (!this.title && this.isNew) {
    await this.populate("customer type");
    const project = this.customer as any;
    const type = this.type as any;

    if (project?.customId && type?.name) {
      this.title = `${project.customId.toUpperCase()}-${type?.name.toUpperCase()}-${Date.now()}`;
    } else {
      console.warn("Incomplete data for custom ID generation.");
      this.title = `${Date.now()}`;
    }
  }
  next();
});

export const ActivityModel = mongoose.model<IActivity>(
  "Activity",
  ActivitySchema
);

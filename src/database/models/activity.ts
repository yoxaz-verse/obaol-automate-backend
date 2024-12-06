import mongoose from "mongoose";
import { ProjectModel } from "./project";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { CustomerModel } from "./customer";
import { ActivityStatusModel } from "./activityStatus";
import { ActivityTypeModel } from "./activityType";
import { ActivityManagerModel } from "./activityManager";

interface IActivity extends mongoose.Document {
  // Basic details
  title: string;
  description: string;
  project: mongoose.Schema.Types.ObjectId | typeof ProjectModel;
  forecastDate?: Date;
  actualDate?: Date;
  targetOperationDate?: Date;
  targetFinanceDate?: Date;

  // Management and assignment
  activityManager: mongoose.Schema.Types.ObjectId | typeof ActivityManagerModel;
  worker: Array<mongoose.Schema.Types.ObjectId | typeof WorkerModel>;

  // Status and tracking
  updatedBy: string; // Role of the user who last updated the activity
  statusHistory: Array<
    mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel
  >;
  status: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel;
  previousStatus?: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel; // Previous status (for suspension/blocking)

  // Rejection and reasoning
  rejectionReason: string[]; // List of reasons for rejection

  // Customer association
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;

  // Activity type
  type: mongoose.Schema.Types.ObjectId | typeof ActivityTypeModel;

  // Additional tracking
  hoursSpent: number; // Hours spent on the activity
}

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
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

export const ActivityModel = mongoose.model<IActivity>(
  "Activity",
  ActivitySchema
);

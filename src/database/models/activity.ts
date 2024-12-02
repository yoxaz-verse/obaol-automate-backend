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
  forecastDate: Date;
  actualDate: Date;
  targetOperationDate: Date;
  targetFinanceDate: Date;
  activityManager: mongoose.Schema.Types.ObjectId | typeof ActivityManagerModel;
  worker: Array<mongoose.Schema.Types.ObjectId | typeof WorkerModel>;
  // updatedBy:
  //   | mongoose.Schema.Types.ObjectId
  //   | typeof WorkerModel
  //   | typeof ManagerModel;
  updatedByModel: string; // Field to support refPath
  hoursSpent: number;
  statusHistory: Array<
    mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel
  >;
  status: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel;
  type: mongoose.Schema.Types.ObjectId | typeof ActivityTypeModel;
  workCompleteStatus: boolean;
  managerFullStatus: boolean;
  customerStatus: boolean;
  isSubmitted: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string[];
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  isPending: boolean;
  isOnHold: boolean;
  isDisabled: boolean;
  isDeleted: boolean;
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
    forecastDate: { type: Date, required: true },
    actualDate: { type: Date, required: true },
    targetFinanceDate: { type: Date, required: true },
    targetOperationDate: { type: Date, required: true },
    worker: [{ type: mongoose.Schema.Types.ObjectId, ref: "Worker" }],
    // updatedBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   refPath: "updatedByModel",
    //   required: true,
    // },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityType",
      required: true,
    },
    updatedByModel: {
      type: String,
      required: true,
      enum: ["Worker", "Manager"],
    },
    hoursSpent: { type: Number, required: true },
    statusHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ActivityStatus" },
    ],
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityStatus",
      required: true,
    },
    workCompleteStatus: { type: Boolean, default: false },
    managerFullStatus: { type: Boolean, default: false },
    customerStatus: { type: Boolean, default: false },
    isSubmitted: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    rejectionReason: [{ type: String, default: "" }],
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    activityManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityManager",
      required: true,
    },
    isPending: { type: Boolean, default: true },
    isOnHold: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ActivityModel = mongoose.model<IActivity>(
  "Activity",
  ActivitySchema
);

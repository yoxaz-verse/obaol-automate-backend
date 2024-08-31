import mongoose from "mongoose";
import { ProjectModel } from "./project";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { CustomerModel } from "./customer";
import { ActivityStatusModel } from "./activityStatus";

interface IActivity extends mongoose.Document {
  title: string;
  description: string;
  project: mongoose.Schema.Types.ObjectId | typeof ProjectModel;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: Array<mongoose.Schema.Types.ObjectId | typeof WorkerModel>;
  updatedBy: mongoose.Schema.Types.ObjectId | typeof WorkerModel | typeof ManagerModel;
  hoursSpent: number;
  statusHistory: Array<mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel>;
  status: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel;
  workCompleteStatus: boolean;
  managerFullStatus: boolean;
  customerStatus: boolean;
  isSubmitted: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string;
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
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    budget: { type: Number, required: true },
    forecastDate: { type: Date, required: true },
    actualDate: { type: Date, required: true },
    targetDate: { type: Date, required: true },
    workers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Worker" }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'updatedByModel', required: true },
    hoursSpent: { type: Number, required: true },
    statusHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "ActivityStatus" }],
    status: { type: mongoose.Schema.Types.ObjectId, ref: "ActivityStatus", required: true },
    workCompleteStatus: { type: Boolean, default: false },
    managerFullStatus: { type: Boolean, default: false },
    customerStatus: { type: Boolean, default: false },
    isSubmitted: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    rejectionReason: { type: String, default: "" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    isPending: { type: Boolean, default: true },
    isOnHold: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const ActivityModel = mongoose.model<IActivity>("Activity", ActivitySchema);

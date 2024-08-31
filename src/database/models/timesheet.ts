import mongoose from "mongoose";
import { ActivityModel } from "./activity";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";

interface ITimesheet extends mongoose.Document {
  activity: mongoose.Schema.Types.ObjectId | typeof ActivityModel;
  worker: mongoose.Schema.Types.ObjectId | typeof WorkerModel;
  manager: mongoose.Schema.Types.ObjectId | typeof ManagerModel;
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  isPending: boolean;
  isRejected: boolean;
  isAccepted: boolean;
  isResubmitted: boolean;
  rejectionReason: string[];
}

const TimesheetSchema = new mongoose.Schema(
  {
    activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity", required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    hoursSpent: { type: Number, required: true },
    date: { type: Date, required: true },
    file: { type: String, required: true },
    isPending: { type: Boolean, default: true },
    isRejected: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isResubmitted: { type: Boolean, default: false },
    rejectionReason: [{ type: String }],
  },
  { timestamps: true }
);

export const TimesheetModel = mongoose.model<ITimesheet>("Timesheet", TimesheetSchema);

import mongoose from "mongoose";
import { ActivityModel } from "./activity";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { ITimesheet } from "../../interfaces/timesheet";

const TimesheetSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
    },
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
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TimesheetModel = mongoose.model<ITimesheet>(
  "Timesheet",
  TimesheetSchema
);

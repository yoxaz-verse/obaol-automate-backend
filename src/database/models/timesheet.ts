import mongoose from "mongoose";
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
      required: false, // Make this optional
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByRole",
      required: true,
    },
    createdByRole: {
      type: String,
      enum: ["Admin", "ProjectManager", "ActivityManager", "Worker"],
      required: true,
    },
    note: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    hoursSpent: { type: Number, required: false }, // Automatically calculated
    date: { type: Date, required: true },
    file: { type: String },
    isPending: { type: Boolean, default: true },
    isRejected: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isResubmitted: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Middleware to calculate hoursSpent before saving
TimesheetSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    const startTime = new Date(this.startTime);
    const endTime = new Date(this.endTime);

    if (endTime > startTime) {
      this.hoursSpent =
        Math.abs(endTime.getTime() - startTime.getTime()) / 36e5; // Convert ms to hours
    } else {
      throw new Error("End time must be after start time");
    }
  }
  next();
});

export const TimesheetModel = mongoose.model<ITimesheet>(
  "Timesheet",
  TimesheetSchema
);

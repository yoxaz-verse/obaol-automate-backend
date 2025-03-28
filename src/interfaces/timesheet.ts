import mongoose from "mongoose";
import { ActivityModel } from "@database/models/activity";
import { WorkerModel } from "@database/models/worker";
import { ActivityManagerModel } from "../database/models/inventoryManager";

export interface IUpdateTimesheet {
  activity?: string; // Activity ID
  createdByRole: string;
  createdBy: mongoose.Schema.Types.ObjectId | typeof WorkerModel;
  note?: string;
  startTime?: Date;
  endTime?: Date;
  hoursSpent?: number;
  date?: Date;
  fileId?: string; // Identifier for the uploaded file
  fileURL?: string; // URL to access the uploaded file (optional)  isPending?: boolean;
  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  // Add any additional fields if necessary
}

export interface ITimesheet extends mongoose.Document {
  activity: mongoose.Schema.Types.ObjectId | typeof ActivityModel;
  createdBy: mongoose.Schema.Types.ObjectId;
  createdByRole: string;
  note?: string;
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  isResubmitted?: boolean;
}

import { IActivity } from "./activity";
import { IWorker } from "./worker";
import { IManager } from "./manager";
import mongoose from "mongoose";
import { ActivityModel } from "@database/models/activity";
import { WorkerModel } from "@database/models/worker";
import { ManagerModel } from "@database/models/manager";

export interface IUpdateTimesheet {
  activity?: string; // Activity ID
  worker?: string; // Worker ID
  manager?: string; // Manager ID
  startTime?: Date;
  endTime?: Date;
  hoursSpent?: number;
  date?: Date;
  fileId?: string; // Identifier for the uploaded file
  fileURL?: string; // URL to access the uploaded file (optional)  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  isResubmitted?: boolean;
  rejectionReason?: string[];
  isDeleted?: boolean;
  isActive?: boolean;
  // Add any additional fields if necessary
}

export interface ITimesheet extends mongoose.Document {
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
  isDeleted: boolean;
  isActive: boolean;
}

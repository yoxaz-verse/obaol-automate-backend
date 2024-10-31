import { IActivity } from "./activity";
import { IWorker } from "./worker";
import { IManager } from "./manager";

export interface ITimesheet {
  _id: string;
  activity: IActivity;
  worker: IWorker;
  manager: IManager;
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

export interface ICreateTimesheet {
  activity: string; // Activity ID
  worker: string;   // Worker ID
  manager: string;  // Manager ID
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  // Add any additional fields if necessary
}

export interface IUpdateTimesheet {
  activity?: string; // Activity ID
  worker?: string;   // Worker ID
  manager?: string;  // Manager ID
  startTime?: Date;
  endTime?: Date;
  hoursSpent?: number;
  date?: Date;
  file?: string;
  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  isResubmitted?: boolean;
  rejectionReason?: string[];
  isDeleted?: boolean;
  isActive?: boolean;
  // Add any additional fields if necessary
}

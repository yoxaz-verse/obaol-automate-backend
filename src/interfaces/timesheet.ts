import { IActivity } from "./activity";
import { IManager } from "./manager";
import { IWorker } from "./worker";

export interface ITimesheet {
  _id: string;
  activity: string | IActivity;
  worker: string | IWorker;
  manager: string | IManager;
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

export interface ICreateTimesheet {
  activity: string;
  worker: string;
  manager: string;
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  isResubmitted?: boolean;
  rejectionReason?: string[];
}

export interface IUpdateTimesheet {
  activity?: string;
  worker?: string;
  manager?: string;
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
}

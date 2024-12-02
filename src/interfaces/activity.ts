import { IProject } from "./project";
import { IWorker } from "./worker";
import { IManager } from "./manager";
import { ICustomer } from "./customer";
import { IActivityStatus } from "./activityStatus";

export interface IActivity {
  _id: string;
  title: string;
  description: string;
  project: IProject;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  worker: IWorker[];
  updatedBy: IWorker | IManager;
  hoursSpent: number;
  statusHistory: IActivityStatus[];
  status: IActivityStatus;
  workCompleteStatus: boolean;
  managerFullStatus: boolean;
  customerStatus: boolean;
  isSubmitted: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string;
  customer: ICustomer;
  isPending: boolean;
  isOnHold: boolean;
  isDisabled: boolean;
  isDeleted: boolean;
}

export interface ICreateActivity {
  title: string;
  description: string;
  project: string; // Project ID
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: string[]; // Worker IDs
  updatedBy: string; // Worker or Manager ID
  updatedByModel: "Worker" | "Manager";
  hoursSpent: number;
  status: string; // ActivityStatus ID
  customer: string; // Customer ID
  // Add any additional fields if necessary
}

export interface IUpdateActivity {
  title?: string;
  description?: string;
  project?: string; // Project ID
  budget?: number;
  forecastDate?: Date;
  actualDate?: Date;
  targetDate?: Date;
  workers?: string[]; // Worker IDs
  updatedBy?: string; // Worker or Manager ID
  updatedByModel?: "Worker" | "Manager";
  hoursSpent?: number;
  status?: string; // ActivityStatus ID
  workCompleteStatus?: boolean;
  managerFullStatus?: boolean;
  customerStatus?: boolean;
  isSubmitted?: boolean;
  isAccepted?: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
  customer?: string; // Customer ID
  isPending?: boolean;
  isOnHold?: boolean;
  isDisabled?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

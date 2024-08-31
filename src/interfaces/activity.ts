import { IProject } from "./project";
import { IWorker } from "./worker";
import { IManager } from "./manager";
import { ICustomer } from "./customer";
import { IActivityStatus } from "./activityStatus";

export interface IActivity {
  title: string;
  description: string;
  project: string | IProject;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: string[] | IWorker[];
  updatedBy: string | IWorker | IManager;
  hoursSpent: number;
  statusHistory: string[] | IActivityStatus[];
  status: string | IActivityStatus;
  workCompleteStatus: boolean;
  managerFullStatus: boolean;
  customerStatus: boolean;
  isSubmitted: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  rejectionReason: string;
  customer: string | ICustomer;
  isPending: boolean;
  isOnHold: boolean;
  isDisabled: boolean;
  isDeleted: boolean;
}

export interface ICreateActivity {
  title: string;
  description: string;
  project: string;
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: string[];
  updatedBy: string;
  status: string;
  customer: string;
}

export interface IUpdateActivity {
  title?: string;
  description?: string;
  project?: string;
  budget?: number;
  forecastDate?: Date;
  actualDate?: Date;
  targetDate?: Date;
  workers?: string[];
  updatedBy?: string;
  status?: string;
  customer?: string;
}

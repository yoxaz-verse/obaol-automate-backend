import mongoose from "mongoose";
import { ProjectModel } from "../database/models/project";
import { ActivityStatusModel } from "../database/models/activityStatus";
import { CustomerModel } from "../database/models/customer";
import { ActivityTypeModel } from "../database/models/activityType";

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

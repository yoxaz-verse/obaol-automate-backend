import { ICustomer } from "./customer";
import { IAdmin } from "./admin";
import { IManager } from "./manager";
import { IProjectStatus } from "./projectStatus";
import { IProjectManager } from "./projectManager";

import mongoose from "mongoose";
import { CustomerModel } from "../database/models/customer";
import { AdminModel } from "../database/models/admin";
import { ManagerModel } from "../database/models/manager";
import { ProjectStatusModel } from "../database/models/projectStatus";
import { ProjectTypeModel } from "../database/models/projectType";
import { LocationModel } from "../database/models/location";
import { ProjectManagerModel } from "../database/models/projectManager";

export interface IProject extends mongoose.Document {
  title: string;
  description: string;
  customId: string;
  prevCustomId: string;
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  projectManager: mongoose.Schema.Types.ObjectId | typeof ProjectManagerModel;
  status: mongoose.Schema.Types.ObjectId | typeof ProjectStatusModel;
  type: mongoose.Schema.Types.ObjectId | typeof ProjectTypeModel;
  location: mongoose.Schema.Types.ObjectId | typeof LocationModel;
  task: string;
  orderNumber: string;
  assignmentDate: Date;
  schedaRadioDate: Date;
  statusHistory: mongoose.Schema.Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
}

export interface ICreateProject {
  title: string;
  description: string;
  customer: string; // Customer ID
  projectManager: string; // Project ID
  // Add any additional fields if necessary
}

export interface IUpdateProject {
  title?: string;
  description?: string;
  customer?: string; // Customer ID
  projectManager?: string; // Manager ID
  status?: string; // ProjectStatus ID
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

import { ICustomer } from "./customer";
import { IAdmin } from "./admin";
import { IManager } from "./manager";
import { IProjectStatus } from "./projectStatus";
import { IProjectManager } from "./projectManager";

export interface IProject {
  _id: string;
  title: string;
  description: string;
  customId?: string;
  budget: string;
  prevCustomId: string;
  customer: ICustomer;
  admin: IAdmin;
  projectManager: IProjectManager;
  status: IProjectStatus;
  statusHistory: IProjectStatus[];
  isActive: boolean;
  isDeleted: boolean;
  // Add any additional fields if necessary
}

export interface ICreateProject {
  title: string;
  description: string;
  budget: string;
  customer: string; // Customer ID
  admin: string; // Admin ID
  projectManager: string; // Project ID
  status: string; // ProjectStatus ID
  // Add any additional fields if necessary
}

export interface IUpdateProject {
  title?: string;
  description?: string;
  budget?: string;
  customer?: string; // Customer ID
  admin?: string; // Admin ID
  projectManager?: string; // Manager ID
  status?: string; // ProjectStatus ID
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

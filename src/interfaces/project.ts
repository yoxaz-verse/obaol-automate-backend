import { ICustomer } from "./customer";
import { IAdmin } from "./admin";
import { IManager } from "./manager";
import { IProjectStatus } from "./projectStatus";

export interface IProject {
  title: string;
  description: string;
  customId: string;
  customer: string | ICustomer;
  admin: string | IAdmin;
  manager: string | IManager;
  status: string | IProjectStatus;
  statusHistory: string[];
  isActive: boolean;
  isDeleted: boolean;
}

export interface ICreateProject {
  title: string;
  description: string;
  customer: string;
  admin: string;
  manager: string;
  status: string;
}

export interface IUpdateProject {
  title?: string;
  description?: string;
  customer?: string;
  admin?: string;
  manager?: string;
  status?: string;
}

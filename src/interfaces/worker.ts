import { IServiceCompany } from "./serviceCompany";
import mongoose from "mongoose";

export interface IWorker {
  [x: string]: any;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isService: boolean;
  name: string;
  password: string;
  serviceCompany?: string;
}

export interface ICreateWorker {
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isService?: boolean;
  name: string;
  password: string;
  serviceCompany: string;
}

export interface IUpdateWorker {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isService?: boolean;
  name?: string;
  password?: string;
  serviceCompany?: string;
}

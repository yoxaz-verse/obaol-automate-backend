import { IServiceCompany } from "./serviceCompany";
import mongoose from "mongoose";

export interface IWorker {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isService: boolean;
  name: string;
  password: string;
  serviceCompany?: mongoose.Schema.Types.ObjectId | IServiceCompany;
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

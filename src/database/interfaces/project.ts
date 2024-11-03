import mongoose from "mongoose";
import { CustomerModel } from "../models/customer";
import { AdminModel } from "../models/admin";
import { ManagerModel } from "../models/manager";
import { ProjectStatusModel } from "../models/projectStatus";
import { ProjectTypeModel } from "../models/projectType";

export interface IProject extends mongoose.Document {
  title: string;
  description: string;
  customId: string;
  prevCustomId: string;
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  admin: mongoose.Schema.Types.ObjectId | typeof AdminModel;
  manager: mongoose.Schema.Types.ObjectId | typeof ManagerModel;
  status: mongoose.Schema.Types.ObjectId | typeof ProjectStatusModel;
  type: mongoose.Schema.Types.ObjectId | typeof ProjectTypeModel;
  task: string;
  orderNumber: string;
  assignmentDate: Date;
  schedaRadioDate: Date;
  statusHistory: mongoose.Schema.Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
}

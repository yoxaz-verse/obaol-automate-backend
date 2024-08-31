import mongoose from "mongoose";
import { ServiceCompanyModel } from "./serviceCompany";

interface IWorker extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isService: boolean;
  name: string;
  password: string;
  serviceCompany: mongoose.Schema.Types.ObjectId | typeof ServiceCompanyModel;
}

const WorkerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isService: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    serviceCompany: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceCompany", required: true }
  },
  { timestamps: true }
);

export const WorkerModel = mongoose.model<IWorker>("Worker", WorkerSchema);

import mongoose from "mongoose";

interface IServiceCompany extends mongoose.Document {
  name: string;
  address: string;
  description?: string;
  map?: string;
  url?: string;
  isActive: boolean;
  isDeleted: boolean;
}

const ServiceCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    description: { type: String },
    map: { type: String },
    url: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ServiceCompanyModel = mongoose.model<IServiceCompany>(
  "ServiceCompany",
  ServiceCompanySchema
);

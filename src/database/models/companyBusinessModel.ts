import mongoose from "mongoose";

interface ICompanyBusinessModel extends mongoose.Document {
  name?: string;
  description?: string;
  isDeleted: boolean;
}

const CompanyBusinessModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CompanyBusinessModelModel = mongoose.model<ICompanyBusinessModel>(
  "CompanyBusinessModel",
  CompanyBusinessModelSchema
);

import mongoose from "mongoose";

interface ICompanyType extends mongoose.Document {
  _id: string;
  name: string;
}

const CompanyTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const CompanyTypeModel = mongoose.model<ICompanyType>(
  "CompanyType",
  CompanyTypeSchema
);

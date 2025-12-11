import mongoose from "mongoose";
import { Types } from "mongoose";

interface ICompanyType extends mongoose.Document {
  _id: Types.ObjectId ;  // accept both during conversions
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

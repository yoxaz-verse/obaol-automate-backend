import mongoose from "mongoose";

interface ICompanyStage extends mongoose.Document {
  name?: string;
  description?: string;
  isDeleted: boolean;
}

const CompanyStageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CompanyStageModel = mongoose.model<ICompanyStage>(
  "CompanyStage",
  CompanyStageSchema
);

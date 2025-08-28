import mongoose from "mongoose";

const ResearchedCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    phoneSecondary: { type: String, required: true },
    state: { type: mongoose.Types.ObjectId, ref: "State" },
    product: { type: mongoose.Types.ObjectId, ref: "Product" },
    certification: { type: mongoose.Types.ObjectId, ref: "Certification" },
    companyBusinessModel: {
      type: mongoose.Types.ObjectId,
      ref: "CompanyBusinessModel",
    },
    companyIntent: { type: mongoose.Types.ObjectId, ref: "SubIntent" },
    district: { type: mongoose.Types.ObjectId, ref: "District" },
    companyType: { type: mongoose.Types.ObjectId, ref: "CompanyType" },
    companyStage: { type: mongoose.Types.ObjectId, ref: "CompanyStage" },
    division: {
      type: mongoose.Types.ObjectId,
      ref: "Division",
      required: false,
    },
    pincodeEntry: {
      type: mongoose.Types.ObjectId,
      ref: "PincodeEntry",
      required: false,
    },
  },
  { timestamps: true }
);

export const ResearchedCompanyModel = mongoose.model(
  "ResearchedCompany",
  ResearchedCompanySchema
);

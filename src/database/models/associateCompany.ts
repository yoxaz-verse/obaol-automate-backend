import mongoose from "mongoose";

const AssociateCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    phoneSecondary: { type: String, required: true },
  },
  { timestamps: true }
);

export const AssociateCompanyModel = mongoose.model(
  "AssociateCompany",
  AssociateCompanySchema
);

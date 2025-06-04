import mongoose from "mongoose";

const AssociateCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    state: { type: mongoose.Types.ObjectId, ref: "State" },
    district: { type: mongoose.Types.ObjectId, ref: "District" },
    city: { type: mongoose.Types.ObjectId, ref: "City" },
    phoneSecondary: { type: String, required: true },
  },
  { timestamps: true }
);

export const AssociateCompanyModel = mongoose.model(
  "AssociateCompany",
  AssociateCompanySchema
);

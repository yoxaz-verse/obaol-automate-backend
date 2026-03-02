import mongoose from "mongoose";
import { COMPANY_INTERESTS } from "../../constants/companyInterests";

const CompanyInterestProfileSchema = new mongoose.Schema(
  {
    associateCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssociateCompany",
      required: true,
      unique: true,
      index: true,
    },
    interests: [
      {
        type: String,
        enum: COMPANY_INTERESTS,
        required: true,
      },
    ],
    isConfigured: {
      type: Boolean,
      default: false,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    updatedByRole: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

CompanyInterestProfileSchema.pre("save", function (next) {
  const interests = Array.isArray((this as any).interests) ? (this as any).interests : [];
  (this as any).interests = Array.from(new Set(interests.map((x: any) => String(x || "").toUpperCase()).filter(Boolean)));
  (this as any).isConfigured = (this as any).interests.length > 0;
  next();
});

export const CompanyInterestProfileModel = mongoose.model(
  "CompanyInterestProfile",
  CompanyInterestProfileSchema
);

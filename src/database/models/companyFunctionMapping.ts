import mongoose from "mongoose";
import { CompanySubFunctionModel } from "./companySubFunction";

const CompanyFunctionMappingSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
    functionId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyFunction", required: true, index: true },
    subFunctionId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanySubFunction", required: true, index: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CompanyFunctionMappingSchema.index(
  { companyId: 1, functionId: 1, subFunctionId: 1 },
  { unique: true }
);

CompanyFunctionMappingSchema.pre("validate", async function (next) {
  const row = this as any;
  if (!row.subFunctionId || !row.functionId) return next();
  const sub = await CompanySubFunctionModel.findById(row.subFunctionId)
    .select("functionId")
    .lean();
  if (!sub) return next(new Error("Invalid sub-function."));
  if (String(sub.functionId) !== String(row.functionId)) {
    return next(new Error("Selected sub-function does not belong to selected function."));
  }
  return next();
});

export const CompanyFunctionMappingModel = mongoose.model(
  "CompanyFunctionMapping",
  CompanyFunctionMappingSchema
);

import mongoose from "mongoose";

const CompanyFunctionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CompanyFunctionSchema.index({ name: 1 }, { unique: true });
CompanyFunctionSchema.index({ slug: 1 }, { unique: true });

export const CompanyFunctionModel = mongoose.model("CompanyFunction", CompanyFunctionSchema);

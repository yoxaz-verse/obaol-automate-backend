import mongoose from "mongoose";

const CompanySubFunctionSchema = new mongoose.Schema(
  {
    functionId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyFunction", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CompanySubFunctionSchema.index({ functionId: 1, slug: 1 }, { unique: true });
CompanySubFunctionSchema.index({ functionId: 1, name: 1 }, { unique: true });

export const CompanySubFunctionModel = mongoose.model("CompanySubFunction", CompanySubFunctionSchema);

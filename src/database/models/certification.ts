import mongoose from "mongoose";

interface ICertification extends mongoose.Document {
  name?: string;
  description?: string;
  isDeleted: boolean;
}

const CertificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CertificationModel = mongoose.model<ICertification>(
  "Certification",
  CertificationSchema
);

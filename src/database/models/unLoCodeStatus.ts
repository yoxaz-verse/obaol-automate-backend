import mongoose from "mongoose";

interface IUnLoCodeStatus extends mongoose.Document {
  code?: string;
  description?: string;
  isDeleted: boolean;
}

const UnLoCodeStatusSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UnLoCodeStatusModel = mongoose.model<IUnLoCodeStatus>(
  "UnLoCodeStatus",
  UnLoCodeStatusSchema
);

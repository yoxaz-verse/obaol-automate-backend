import mongoose from "mongoose";

interface IDesignation extends mongoose.Document {
  name?: string;
  isDeleted: boolean;
}

const DesignationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const DesignationModel = mongoose.model<IDesignation>(
  "Designation",
  DesignationSchema
);

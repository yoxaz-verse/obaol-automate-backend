import mongoose from "mongoose";

interface IActivityStatus extends mongoose.Document {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
}

const ActivityStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ActivityStatusModel = mongoose.model<IActivityStatus>(
  "ActivityStatus",
  ActivityStatusSchema
);

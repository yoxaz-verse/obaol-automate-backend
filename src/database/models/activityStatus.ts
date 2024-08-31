import mongoose from "mongoose";

interface IActivityStatus extends mongoose.Document {
  name: string;
  priority?: number;
}

const ActivityStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ActivityStatusModel = mongoose.model<IActivityStatus>("ActivityStatus", ActivityStatusSchema);

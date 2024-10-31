import mongoose from "mongoose";

interface IActivityType extends mongoose.Document {
  name: string;
}

const ActivityTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const ActivityTypeModel = mongoose.model<IActivityType>("ActivityType", ActivityTypeSchema);

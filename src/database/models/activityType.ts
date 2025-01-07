import mongoose from "mongoose";

interface IActivityType extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
}

const ActivityTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const ActivityTypeModel = mongoose.model<IActivityType>(
  "ActivityType",
  ActivityTypeSchema
);

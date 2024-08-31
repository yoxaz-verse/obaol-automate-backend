import mongoose from "mongoose";

interface ILocationType extends mongoose.Document {
  name: string;
}

const LocationTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const LocationTypeModel = mongoose.model<ILocationType>("LocationType", LocationTypeSchema);

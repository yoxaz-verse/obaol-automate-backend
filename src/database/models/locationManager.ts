import mongoose from "mongoose";

interface ILocationManager extends mongoose.Document {
  code: string;
  name: string;
  manager: mongoose.Schema.Types.ObjectId;
  managingLocations: mongoose.Schema.Types.ObjectId[];
}

const LocationManagerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", required: true },
    managingLocations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Location" }]
  },
  { timestamps: true }
);

export const LocationManagerModel = mongoose.model<ILocationManager>("LocationManager", LocationManagerSchema);

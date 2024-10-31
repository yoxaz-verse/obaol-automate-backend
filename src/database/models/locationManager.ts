import mongoose from "mongoose";
import { ILocation } from "./location";

interface ILocationManager extends mongoose.Document {
  code: string;
  name: string;
  managingLocations: mongoose.Schema.Types.ObjectId[] | ILocation[];
}

const LocationManagerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    managingLocations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    ],
  },
  { timestamps: true }
);

export const LocationManagerModel = mongoose.model<ILocationManager>(
  "LocationManager",
  LocationManagerSchema
);

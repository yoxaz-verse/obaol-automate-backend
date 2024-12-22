import { ILocation } from "@interfaces/location";
import mongoose from "mongoose";

interface ILocationManager extends mongoose.Document {
  code: string;
  name: string;
}

const LocationManagerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const LocationManagerModel = mongoose.model<ILocationManager>(
  "LocationManager",
  LocationManagerSchema
);

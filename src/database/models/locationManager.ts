import { ILocation } from "@interfaces/location";
import mongoose from "mongoose";

interface ILocationManager extends mongoose.Document {
  name: string;
}

const LocationManagerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const LocationManagerModel = mongoose.model<ILocationManager>(
  "LocationManager",
  LocationManagerSchema
);

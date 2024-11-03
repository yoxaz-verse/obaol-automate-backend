import { ILocation } from "@interfaces/location";
import mongoose from "mongoose";

interface ILocationManager extends mongoose.Document {
  code: string;
  name: string;
  managingLocation: mongoose.Schema.Types.ObjectId | ILocation;
}

const LocationManagerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    managingLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
  },
  { timestamps: true }
);

export const LocationManagerModel = mongoose.model<ILocationManager>(
  "LocationManager",
  LocationManagerSchema
);

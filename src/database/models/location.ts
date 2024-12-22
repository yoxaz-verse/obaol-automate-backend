import { ILocation } from "../../interfaces/location";
import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema<ILocation>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String },
    isNearAnotherLocation: { type: Boolean, default: false },
    latitude: { type: String },
    longitude: { type: String },
    map: { type: String, required: true },
    nation: { type: String, required: true },
    owner: { type: String, required: true },
    province: { type: String, required: true },
    region: { type: String, required: true },
    locationManager: [
      { type: mongoose.Schema.Types.ObjectId, ref: "LocationManager" },
    ],
    locationType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocationType",
      required: true,
    },
  },
  { timestamps: true }
);

export const LocationModel = mongoose.model<ILocation>(
  "Location",
  LocationSchema
);

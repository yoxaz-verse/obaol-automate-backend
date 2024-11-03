import { ILocation } from "../../interfaces/location";
import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema<ILocation>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String },
    isNearAnotherLocation: { type: Boolean, default: false },
    fileId: { type: String }, // Identifier for the uploaded file
    fileURL: { type: String }, // URL to access the uploaded file (optional)
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    map: { type: String, required: true },
    nation: { type: String, required: true },
    owner: { type: String, required: true },
    province: { type: String, required: true },
    region: { type: String, required: true },
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

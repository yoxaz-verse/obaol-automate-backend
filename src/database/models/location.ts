import { ILocation } from "../../interfaces/location";
import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema<ILocation>(
  {
    customId: { type: String, unique: true }, // Ensure uniqueness
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
    street: { type: String },
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

// Custom ID generator
LocationSchema.pre<ILocation>("save", async function (next) {
  if (!this.customId && this.isNew) {
    this.customId = `MG-${this.province.toUpperCase()}-${Date.now()}`;
  }
  next();
});

export const LocationModel = mongoose.model<ILocation>(
  "Location",
  LocationSchema
);

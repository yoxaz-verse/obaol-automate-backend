import mongoose from "mongoose";

interface ILocation extends mongoose.Document {
  name: string;
  address: string;
  city: string;
  description?: string;
  image: string;  // Assuming you'll store the file path as a string
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: mongoose.Schema.Types.ObjectId;
  province: string;
  region: string;
  locationType: mongoose.Schema.Types.ObjectId;
  locationManagers: mongoose.Schema.Types.ObjectId[];
}

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String },
    image: { type: String, required: true },  // Assuming you'll store the file path as a string
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    map: { type: String, required: true },
    nation: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
    province: { type: String, required: true },
    region: { type: String, required: true },
    locationType: { type: mongoose.Schema.Types.ObjectId, ref: "LocationType", required: true },
    locationManagers: [{ type: mongoose.Schema.Types.ObjectId, ref: "LocationManager" }]
  },
  { timestamps: true }
);

export const LocationModel = mongoose.model<ILocation>("Location", LocationSchema);

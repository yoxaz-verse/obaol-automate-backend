import mongoose from "mongoose";
import { ILocationType } from "./locationType";

export interface ILocation extends mongoose.Document {
  name: string;
  address: string;
  city: string;
  description?: string;
  fileId?: string; // Identifier for the uploaded file
  fileURL?: string; // URL to access the uploaded file (optional)
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: string;
  province: string;
  region: string;
  locationType: mongoose.Schema.Types.ObjectId | ILocationType;
  isNearAnotherLocation: boolean;
}

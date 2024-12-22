import mongoose from "mongoose";
import { ILocationType } from "./locationType";

export interface ILocation extends mongoose.Document {
  name: string;
  address: string;
  city: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  map: string;
  nation: string;
  owner: string;
  province: string;
  region: string;
  locationManager: string[];
  locationType: mongoose.Schema.Types.ObjectId | ILocationType;
  isNearAnotherLocation: boolean;
}

import { ILocationType } from "./locationType";
import { ILocationManager } from "./locationManager";
import mongoose from "mongoose";

export interface ILocation {
  _id: string;
  name: string;
  address: string;
  city: string;
  description?: string;
  image: string;
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: mongoose.Schema.Types.ObjectId;
  province: string;
  region: string;
  locationType: mongoose.Schema.Types.ObjectId | ILocationType;
  locationManagers: mongoose.Schema.Types.ObjectId[] | ILocationManager[];
}

export interface ICreateLocation {
  name: string;
  address: string;
  city: string;
  description?: string;
  image: string;
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: string;
  province: string;
  region: string;
  locationType: string;
  locationManagers: string[];
}

export interface IUpdateLocation {
  name?: string;
  address?: string;
  city?: string;
  description?: string;
  image?: string;
  latitude?: string;
  longitude?: string;
  map?: string;
  nation?: string;
  owner?: string;
  province?: string;
  region?: string;
  locationType?: string;
  locationManagers?: string[];
}

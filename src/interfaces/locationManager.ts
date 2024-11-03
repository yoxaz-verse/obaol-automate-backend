import { ILocation } from "../database/models/location";
import mongoose from "mongoose";

export interface ILocationManager {
  code: string;
  name: string;
  managingLocations: mongoose.Schema.Types.ObjectId[] | ILocation[];
}

export interface ICreateLocationManager {
  code: string;
  name: string;
  managingLocations?: string[];
}

export interface IUpdateLocationManager {
  code?: string;
  name?: string;
  managingLocations?: string[];
}

import { IManager } from "./manager";
import { ILocation } from "./location";
import mongoose from "mongoose";

export interface ILocationManager {
  code: string;
  name: string;
  manager: mongoose.Schema.Types.ObjectId | IManager;
  managingLocations: mongoose.Schema.Types.ObjectId[] | ILocation[];
}

export interface ICreateLocationManager {
  code: string;
  name: string;
  manager: string;
  managingLocations?: string[];
}

export interface IUpdateLocationManager {
  code?: string;
  name?: string;
  manager?: string;
  managingLocations?: string[];
}

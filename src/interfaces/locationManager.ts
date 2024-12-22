import mongoose from "mongoose";
import { ILocation } from "./location";

export interface ILocationManager {
  code: string;
  name: string;
}

export interface ICreateLocationManager {
  code: string;
  name: string;
}

export interface IUpdateLocationManager {
  code?: string;
  name?: string;
}

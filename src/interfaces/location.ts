import mongoose from "mongoose";
import { IFile } from "./file";

export interface ILocationBase {
  _id: mongoose.Types.ObjectId;
  name: string;
  address: string;
  city: string;
  description?: string;
  image: mongoose.Types.ObjectId; // Reference to File
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: string;
  province: string;
  region: string;
  locationType: string;
  locationManagers?: string[];
}
export interface ILocationPopulated extends ILocationBase {
  image: IFile; // Populated image
}
export interface ICreateLocation {
  name: string;
  address: string;
  city: string;
  description?: string;
  image: string; // Image file ID
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: string;
  province: string;
  region: string;
  locationType: string;
  locationManagers?: string[];
}

export interface IUpdateLocation {
  name?: string;
  address?: string;
  city?: string;
  description?: string;
  image?: string; // Image file ID
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

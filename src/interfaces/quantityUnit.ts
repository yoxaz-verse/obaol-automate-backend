import { Document, Types } from "mongoose";

export interface IQuantityUnit extends Document {
  name: string;
  description?: string;
}

export interface ICreateQuantityUnit {
  name: string;
  description?: string;
}

export interface IUpdateQuantityUnit {
  name?: string;
  description?: string;
}

import { Document, Types } from "mongoose";

export interface ICategory extends Document {
  _id: string;
  name: string;
  description?: string;
  inventoryManager: Types.ObjectId;
  createdAt?: Date;
}

export interface ICreateCategory {
  name: string;
  description?: string;
  inventoryManager: Types.ObjectId;
}

export interface IUpdateCategory {
  name?: string;
  description?: string;
  inventoryManager?: Types.ObjectId;
}

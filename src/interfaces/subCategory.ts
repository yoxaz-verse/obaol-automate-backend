import { Document, Types } from "mongoose";

export interface ISubCategory extends Document {
  name: string;
  description?: string;
  category: Types.ObjectId;
  createdAt?: Date;
}

export interface ICreateSubCategory {
  name: string;
  description?: string;
  category: Types.ObjectId;
}

export interface IUpdateSubCategory {
  name?: string;
  description?: string;
  category?: Types.ObjectId;
}

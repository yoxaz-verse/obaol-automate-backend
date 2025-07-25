import { Document, Types } from "mongoose";

export interface IProduct extends Document {
  _id: string;
  name: string;
  description: string;
  subCategory: Types.ObjectId;
}

export interface ICreateProduct {
  name: string;
  description: string;
  subCategory: Types.ObjectId;
}

export interface IUpdateProduct {
  name?: string;
  description?: string;
  subCategory?: Types.ObjectId;
}

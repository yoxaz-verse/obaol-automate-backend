import { Document, Types } from "mongoose";

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  slug?: string;
  description: string;
  subCategory: Types.ObjectId;
  state?: Types.ObjectId[];
}

export interface ICreateProduct {
  name: string;
  slug?: string;
  description: string;
  subCategory: Types.ObjectId;
  state?: Types.ObjectId[];
}

export interface IUpdateProduct {
  name?: string;
  slug?: string;
  description?: string;
  subCategory?: Types.ObjectId;
  state?: Types.ObjectId[];
}

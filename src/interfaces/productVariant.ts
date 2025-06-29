import { Document, Types } from "mongoose";

export interface IProductVariant extends Document {
  _id: string;
  name: string;
  description: string;
  isAvailable: boolean;
  isLive: boolean;
  product: Types.ObjectId;
}

export interface ICreateProductVariant {
  name: string;
  description: string;
  isAvailable?: boolean;
  isLive?: boolean;
  product: Types.ObjectId;
}

export interface IUpdateProductVariant {
  name?: string;
  description?: string;
  isAvailable?: boolean;
  isLive?: boolean;
  product?: Types.ObjectId;
}

import { Document, Types } from "mongoose";

export interface IVariantRate extends Document {
  rate: number;
  selected?: boolean;
  productVariant: Types.ObjectId; // Reference to ProductVariant model
  associate: Types.ObjectId; // Reference to Associate model
  duration?: number;
  commission?: number;
  associateCompany?: Types.ObjectId; // Reference to Associate model
  isLive: boolean;
  createdAt?: Date;
}

export interface ICreateVariantRate {
  rate: number;
  productVariant: Types.ObjectId;
  selected?: boolean;
  commission?: number;
  duration?: number;
  isLive?: boolean;
  associate: Types.ObjectId;
}

export interface IUpdateVariantRate {
  rate?: number;
  productVariant?: Types.ObjectId;
  selected?: boolean;
  commission?: number;
  duration?: number;
  isLive?: boolean;
  associate?: Types.ObjectId;
}

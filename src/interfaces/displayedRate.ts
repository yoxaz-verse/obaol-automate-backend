import { Document, Types } from "mongoose";
import { IVariantRate } from "./variantRate";

export interface IDisplayedRate extends Document {
  commission?: number;
  variantRate?: Types.ObjectId | IVariantRate; // Reference to variantRate model
  associate: Types.ObjectId; // Reference to Associate model
  associateCompany?: Types.ObjectId; // Reference to Associate model
  selected?: boolean;
}

export interface ICreateDisplayedRate {
  commission: number;
  variantRate: Types.ObjectId;
  associate: Types.ObjectId;
  selected?: boolean;
}

export interface IUpdateDisplayedRate {
  commission?: number;
  variantRate?: Types.ObjectId;
  associate?: Types.ObjectId;
  selected?: boolean;
}

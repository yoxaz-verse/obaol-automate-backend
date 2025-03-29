import { Document, Types } from "mongoose";

export interface IDisplayedRate extends Document {
  commission?: number;
  variantRate?: Types.ObjectId; // Reference to variantRate model
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

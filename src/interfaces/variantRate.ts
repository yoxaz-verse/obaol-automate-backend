import mongoose, { Document, Types } from "mongoose";

export interface IVariantRate extends Document {
  rate: number;
  quantity?: number;
  selected?: boolean;
  productVariant: Types.ObjectId;
  associate: Types.ObjectId;
  duration?: number;
  commission?: number;
  associateCompany?: Types.ObjectId;
  isLive: boolean;
  tags?: Types.ObjectId[];
  state: mongoose.Schema.Types.ObjectId;
  district: mongoose.Schema.Types.ObjectId;
  division?: mongoose.Schema.Types.ObjectId;
  pincodeEntry?: mongoose.Schema.Types.ObjectId;
  sourceInventory?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
  lastLiveAt?: Date;
  lastLiveDate?: Date;

  // ✅ NEW FIELDS
  lastEditTime?: Date; // Timestamp of last allowed edit
  coolingStartTime?: Date; // Timestamp when cooldown started
  hiddenDraftOf?: Types.ObjectId; // If this is a draft, link to original live rate
  unit?: string; // KG, MT, Quintal
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;
}

export interface ICreateVariantRate {
  rate: number;
  quantity?: number;
  productVariant: Types.ObjectId;
  selected?: boolean;
  commission?: number;
  duration?: number;
  isLive?: boolean;
  associate: Types.ObjectId;
  state: mongoose.Schema.Types.ObjectId;
  district: mongoose.Schema.Types.ObjectId;
  division?: mongoose.Schema.Types.ObjectId;
  pincodeEntry?: mongoose.Schema.Types.ObjectId;
  // Optional new fields (for draft creation, testing, or internal use)
  lastEditTime?: Date;
  coolingStartTime?: Date;
  hiddenDraftOf?: Types.ObjectId;
  lastLiveAt?: Date;
  lastLiveDate?: Date;
  unit?: string;
  sourceInventory?: Types.ObjectId | null;
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;
}

export interface IUpdateVariantRate {
  rate?: number;
  quantity?: number;
  productVariant?: Types.ObjectId;
  selected?: boolean;
  commission?: number;
  duration?: number;
  isLive?: boolean;
  associate?: Types.ObjectId;
  state?: mongoose.Schema.Types.ObjectId;
  district?: mongoose.Schema.Types.ObjectId;
  division?: mongoose.Schema.Types.ObjectId;
  pincodeEntry?: mongoose.Schema.Types.ObjectId;
  // Optional new fields (used internally in service logic)
  lastEditTime?: Date;
  coolingStartTime?: Date;
  hiddenDraftOf?: Types.ObjectId;
  lastLiveAt?: Date;
  lastLiveDate?: Date;
  unit?: string;
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;
}

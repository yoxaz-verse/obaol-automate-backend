import mongoose from "mongoose";
import { DivisionModel } from "./division";

interface IPincodeEntry extends mongoose.Document {
  pincode: string;
  officename: string;
  latitude: number;
  longitude: number;
  division: mongoose.Schema.Types.ObjectId | typeof DivisionModel;
  isDeleted: boolean;
}

const PincodeEntrySchema = new mongoose.Schema(
  {
    pincode: { type: String, required: true, unique: true },
    officename: { type: String, required: true, unique: true },
    latitude: { type: Number },
    longitude: { type: Number },
    division: { type: mongoose.Schema.Types.ObjectId, ref: "Division" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PincodeEntryModel = mongoose.model<IPincodeEntry>(
  "PincodeEntry",
  PincodeEntrySchema
);

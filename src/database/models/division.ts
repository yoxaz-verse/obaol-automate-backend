import mongoose from "mongoose";
import { DistrictModel } from "./district";

interface IDivision extends mongoose.Document {
  name: string;
  district: mongoose.Schema.Types.ObjectId | typeof DistrictModel;
  isDeleted: boolean;
}

const DivisionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    latitude: { type: Number },
    longitude: { type: Number },
    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const DivisionModel = mongoose.model<IDivision>(
  "Division",
  DivisionSchema
);

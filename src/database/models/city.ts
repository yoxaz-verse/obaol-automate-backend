import mongoose, { ObjectId } from "mongoose";
import { DistrictModel } from "./district";
import { AbbreviationModel } from "./abbreviation";

interface ICity extends mongoose.Document {
  serialNo: string;
  name?: string;
  urbanStatus: mongoose.Schema.Types.ObjectId | typeof AbbreviationModel;
  district: mongoose.Schema.Types.ObjectId | typeof DistrictModel;
  isDeleted: boolean;
}

const CitySchema = new mongoose.Schema(
  {
    serialNo: { type: Number, required: true },
    name: { type: String, required: true },
    urbanStatus: { type: mongoose.Schema.Types.ObjectId, ref: "Abbreviation" },
    district: { type: mongoose.Schema.Types.ObjectId, ref: "District" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CityModel = mongoose.model<ICity>("City", CitySchema);

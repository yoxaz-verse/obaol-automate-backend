import mongoose, { ObjectId } from "mongoose";
import { StateModel } from "./state";

interface IDistrict extends mongoose.Document {
  code: string;
  name?: string;
  state: mongoose.Schema.Types.ObjectId | typeof StateModel;
  isDeleted: boolean;
}

const DistrictSchema = new mongoose.Schema(
  {
    code: { type: Number, required: true },
    name: { type: String, required: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const DistrictModel = mongoose.model<IDistrict>(
  "District",
  DistrictSchema
);

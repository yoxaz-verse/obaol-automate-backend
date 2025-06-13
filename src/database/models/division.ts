import mongoose from "mongoose";

interface IDivision extends mongoose.Document {
  name: string;
  division: mongoose.Schema.Types.ObjectId | typeof DivisionModel;
  isDeleted: boolean;
}

const DivisionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    latitude: { type: Number },
    longitude: { type: Number },
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Division",
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

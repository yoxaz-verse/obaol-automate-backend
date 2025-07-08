import mongoose, { Types } from "mongoose";

interface IUnLoCodeAdminArea extends mongoose.Document {
  name?: string; // e.g., "Badghis"
  code?: string; // e.g., "BDG"
  type?: string; // e.g., "Province"
  country: Types.ObjectId; // e.g., "AE"
  isDeleted: boolean;
}

const UnLoCodeAdminAreaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    type: { type: String },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UnLoCodeAdminAreaModel = mongoose.model<IUnLoCodeAdminArea>(
  "UnLoCodeAdminArea",
  UnLoCodeAdminAreaSchema
);

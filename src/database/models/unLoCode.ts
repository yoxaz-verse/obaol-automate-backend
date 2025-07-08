import mongoose, { Types } from "mongoose";

interface IUnLoCode extends mongoose.Document {
  country: Types.ObjectId; // e.g., "AE"
  loCode: string; // e.g., "DXB"
  city: string; // e.g., "Dubai"
  description: string; // e.g., "Dubai International Port"
  adminArea?: Types.ObjectId; // e.g., "DU" or "13" or null
  functions: string[]; // e.g., "1-------"
  status: string; // e.g., "RL"
  locationCode: number | null; // e.g., 1001
  coordinates: {
    latitude: string;
    longitude: string;
  };
  isDeleted: boolean;
}

const UnLoCodeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    loCode: { type: String, required: true },
    description: { type: String, required: true },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    adminArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnLoCodeAdminArea",
    },
    functions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UnLoCodeFunctions",
        required: true,
      },
    ],
    locationCode: { type: Number, required: true },
    coordinates: {
      latitude: {
        type: String,
      },
      longitude: {
        type: String,
      },
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnLoCodeStatus",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UnLoCodeModel = mongoose.model<IUnLoCode>(
  "UnLoCode",
  UnLoCodeSchema
);

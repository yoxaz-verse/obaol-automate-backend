import mongoose from "mongoose";

interface ICountry extends mongoose.Document {
  code: string;
  name?: string;
  isDeleted: boolean;
}

const CountrySchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CountryModel = mongoose.model<ICountry>("Country", CountrySchema);

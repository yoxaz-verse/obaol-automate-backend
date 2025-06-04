import mongoose from "mongoose";

interface IAbbreviation extends mongoose.Document {
  code: string;
  description?: string;
  isDeleted: boolean;
}

const AbbreviationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AbbreviationModel = mongoose.model<IAbbreviation>(
  "Abbreviation",
  AbbreviationSchema
);

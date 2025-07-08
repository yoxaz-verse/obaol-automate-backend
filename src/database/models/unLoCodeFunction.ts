import mongoose from "mongoose";

interface IUnLoCodeFunctions extends mongoose.Document {
  name?: string;
  code?: string;
  description?: string;
  isDeleted: boolean;
}

const UnLoCodeFunctionsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UnLoCodeFunctionsModel = mongoose.model<IUnLoCodeFunctions>(
  "UnLoCodeFunctions",
  UnLoCodeFunctionsSchema
);

import mongoose from "mongoose";

interface IGeneralIntent extends mongoose.Document {
  name?: string;
  description?: string;
  isDeleted: boolean;
}

const GeneralIntentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const GeneralIntentModel = mongoose.model<IGeneralIntent>(
  "GeneralIntent",
  GeneralIntentSchema
);

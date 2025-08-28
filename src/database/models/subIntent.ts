import mongoose from "mongoose";

interface ISubIntent extends mongoose.Document {
  name?: string;
  description?: string;
  generalIntent?: string;
  isDeleted: boolean;
}

const SubIntentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    generalIntent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeneralIntent",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SubIntentModel = mongoose.model<ISubIntent>(
  "SubIntent",
  SubIntentSchema
);

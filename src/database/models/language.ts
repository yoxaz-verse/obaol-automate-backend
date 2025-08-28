import mongoose, { ObjectId } from "mongoose";

interface ILanguage extends mongoose.Document {
  name?: string;
  description?: string;
  country?: string;
  isDeleted: boolean;
}

const LanguageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const LanguageModel = mongoose.model<ILanguage>(
  "Language",
  LanguageSchema
);

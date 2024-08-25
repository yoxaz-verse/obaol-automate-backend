import mongoose from "mongoose";

interface ErrorDocument extends mongoose.Document {
  message: string;
  stack: string;
  resolved: boolean;
  stage: string;
  api: string;
  location: string;
  body: object;
}

const errorSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    stack: { type: String },
    resolved: { type: Boolean, default: false },
    stage: { type: String, required: true },
    api: { type: String, required: true },
    location: { type: String },
    body: { type: Object },
  },
  {
    timestamps: true,
  }
);

export const ErrorModel = mongoose.model<ErrorDocument>("Error", errorSchema);


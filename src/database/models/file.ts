// src/database/models/FileModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IFile extends Document {
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  // createdAt: Date;
  // updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

const FileModel = mongoose.model<IFile>("File", FileSchema);

export default FileModel;

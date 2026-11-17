// src/database/models/FileModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IFile extends Document {
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  storageProvider?: string;
  bucket?: string;
  objectKey?: string;
  checksum?: string;
  uploadedBy?: mongoose.Types.ObjectId;
  // createdAt: Date;
  // updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, default: "" },
    url: { type: String, default: "" },
    storageProvider: { type: String, enum: ["s3", "local"], default: "local", index: true },
    bucket: { type: String, default: "" },
    objectKey: { type: String, default: "", index: true },
    checksum: { type: String, default: "" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "Associate", default: null, index: true },
  },
  { timestamps: true }
);

const FileModel = mongoose.model<IFile>("File", FileSchema);

export default FileModel;

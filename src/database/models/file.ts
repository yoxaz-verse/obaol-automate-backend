// src/database/models/FileModel.ts

import mongoose, { Document, Schema } from "mongoose";

export interface IFile extends Document {
  imageName: string;
  mimeType: string;
  size: string;
  path: string;
  folderPath: string;
  entity: string;
  entityId: string;
}

const FileSchema: Schema = new Schema(
  {
    imageName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: String, required: true },
    path: { type: String, required: true },
    folderPath: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
  },
  { timestamps: true } // Automatically manages createdAt and updatedAt
);

const FileModel = mongoose.model<IFile>("File", FileSchema);

export default FileModel;

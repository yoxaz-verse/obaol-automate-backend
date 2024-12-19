// src/database/models/ActivityFileModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IActivityFile extends Document {
  activityId: mongoose.Types.ObjectId;
  files: {
    file: mongoose.Types.ObjectId;
    status: "Submitted" | "Approved" | "Rejected";
    submittedBy?: mongoose.Types.ObjectId;
    comments?: string;
  }[];
}

const ActivityFileSchema = new Schema<IActivityFile>(
  {
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
    files: [
      {
        file: { type: Schema.Types.ObjectId, ref: "File", required: true },
        status: {
          type: String,
          enum: ["Submitted", "Approved", "Rejected"],
          required: true,
        },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        comments: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const ActivityFileModel = mongoose.model<IActivityFile>(
  "ActivityFile",
  ActivityFileSchema
);

export default ActivityFileModel;

// src/database/models/RateAttachmentModel.ts
import mongoose, { Schema, Types, Document } from "mongoose";

export interface IRateAttachment extends Document {
  variantRate: Types.ObjectId;
  gstDocs: Types.ObjectId[]; // one or more GST documents
  media: Types.ObjectId[]; // photos (JPG, PNG)
  videos: Types.ObjectId[]; // video files
  certificates: Types.ObjectId[]; // any other certs
  createdAt: Date;
  updatedAt: Date;
}

const RateAttachmentSchema = new Schema<IRateAttachment>(
  {
    variantRate: {
      type: Schema.Types.ObjectId,
      ref: "VariantRate",
      required: true,
      unique: true, // one attachments doc per rate
    },
    gstDocs: [{ type: Schema.Types.ObjectId, ref: "File" }],
    media: [{ type: Schema.Types.ObjectId, ref: "File" }],
    videos: [{ type: Schema.Types.ObjectId, ref: "File" }],
    certificates: [{ type: Schema.Types.ObjectId, ref: "File" }],
  },
  { timestamps: true }
);

export const RateAttachmentModel = mongoose.model<IRateAttachment>(
  "RateAttachment",
  RateAttachmentSchema
);

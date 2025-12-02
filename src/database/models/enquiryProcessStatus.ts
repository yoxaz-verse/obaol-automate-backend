import mongoose, { Types } from "mongoose";

interface IEnquiryProcessStatus extends mongoose.Document {
  _id: Types.ObjectId | string;  // accept both during conversions
  name: string;
  priority?: number;
}

const EnquiryProcessStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const EnquiryProcessStatusModel = mongoose.model<IEnquiryProcessStatus>(
  "EnquiryProcessStatus",
  EnquiryProcessStatusSchema
);

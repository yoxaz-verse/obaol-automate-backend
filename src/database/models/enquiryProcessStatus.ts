import mongoose from "mongoose";

interface IEnquiryProcessStatus extends mongoose.Document {
  _id: string;
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

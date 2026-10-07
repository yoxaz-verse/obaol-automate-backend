import mongoose, { Schema } from "mongoose";
import { ISupportContact } from "../../interfaces/supportContact";

const SupportContactSchema = new Schema<ISupportContact>(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    phoneNumber: { type: String, required: true, trim: true },
    displayPhoneNumber: { type: String, required: true, trim: true },
    phoneCountryCode: { type: String, required: true, trim: true },
    phoneNational: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SupportContactSchema.index({ isDeleted: 1, isActive: 1, sortOrder: 1 });

export const SupportContactModel = mongoose.model<ISupportContact>("SupportContact", SupportContactSchema);

import mongoose from "mongoose";

interface ICustomer extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
}

const CustomerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

export const CustomerModel = mongoose.model<ICustomer>("Customer", CustomerSchema);

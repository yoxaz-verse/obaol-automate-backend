import mongoose from "mongoose";
import { passwordPlugin } from "./plugins/password.plugin";

interface IAssociate extends mongoose.Document {
  name: string;
  email: string;
  phone?: string;
  phoneSecondary?: string;
  associateCompany?: mongoose.Types.ObjectId;
  password: string;
  role: string;
  designation?: mongoose.Types.ObjectId;
  isActive: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AssociateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: false },
    phoneSecondary: { type: String, required: false },
    associateCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssociateCompany",
      required: false,
    },
    password: { type: String, required: true },
    role: { type: String, default: "Associate" },
    designation: { type: mongoose.Types.ObjectId, ref: "Designation", required: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AssociateSchema.plugin(passwordPlugin);

export const AssociateModel = mongoose.model<IAssociate>("Associate", AssociateSchema);

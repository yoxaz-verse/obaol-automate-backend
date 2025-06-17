import mongoose from "mongoose";

const AssociateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    phoneSecondary: { type: String, required: true },
    associateCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssociateCompany",
      required: true,
    },
    password: { type: String, required: true },
    role: { type: String, default: "Associate" }, // Assign default role
    designation: { type: mongoose.Types.ObjectId, ref: "Designation" },
  },
  { timestamps: true }
);

export const AssociateModel = mongoose.model("Associate", AssociateSchema);

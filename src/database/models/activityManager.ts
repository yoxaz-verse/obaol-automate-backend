import mongoose from "mongoose";
import { IManager } from "../../interfaces/manager";

const ActivityManagerSchema = new mongoose.Schema<IManager>(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Linking to Admin
    fileId: { type: String }, // Identifier for the uploaded file
    fileURL: { type: String }, // URL to access the uploaded file (optional)
    role: { type: String, default: "Activitymanager" }, // Assign default role
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
// Uncomment the following lines if you wish to hash passwords before saving
/*
import bcrypt from "bcrypt";

ActivityManagerSchema.pre<IActivityManager>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
*/

export const ActivityManagerModel = mongoose.model<IManager>(
  "ActivityManager",
  ActivityManagerSchema
);

import mongoose from "mongoose";
import { IInventoryManager } from "../../interfaces/inventoryManager";

const InventoryManagerSchema = new mongoose.Schema<IInventoryManager>(
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
    role: { type: String, default: "InventoryManager" }, // Assign default role
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
/*
import bcrypt from "bcrypt";

InventoryManagerSchema.pre<IInventoryManager>("save", async function (next) {
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

export const InventoryManagerModel = mongoose.model<IInventoryManager>(
  "InventoryManager",
  InventoryManagerSchema
);

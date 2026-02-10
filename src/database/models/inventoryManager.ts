import mongoose from "mongoose";
import { IInventoryManager } from "../../interfaces/inventoryManager";
import { passwordPlugin } from "./plugins/password.plugin";

interface IInventoryManagerDoc extends Omit<IInventoryManager, "_id">, mongoose.Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const InventoryManagerSchema = new mongoose.Schema(
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
    },
    role: { type: String, default: "InventoryManager" },
  },
  { timestamps: true }
);

InventoryManagerSchema.plugin(passwordPlugin);

export const InventoryManagerModel = mongoose.model<IInventoryManagerDoc>(
  "InventoryManager",
  InventoryManagerSchema
);

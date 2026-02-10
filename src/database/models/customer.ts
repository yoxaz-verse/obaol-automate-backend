import mongoose from "mongoose";
import { baseSchemaPlugin } from "./plugins/base.schema";
import { passwordPlugin } from "./plugins/password.plugin";

export interface ICustomer extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  role: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const CustomerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "Customer" },
  }
);

CustomerSchema.plugin(baseSchemaPlugin);
CustomerSchema.plugin(passwordPlugin);

export const CustomerModel = mongoose.model<ICustomer>(
  "Customer",
  CustomerSchema
);

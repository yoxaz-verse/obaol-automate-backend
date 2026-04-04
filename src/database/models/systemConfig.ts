import mongoose, { Schema } from "mongoose";
import { ISystemConfig } from "../../interfaces/systemConfig";

const SystemConfigSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const SystemConfigModel = mongoose.model<ISystemConfig>(
  "SystemConfig",
  SystemConfigSchema
);


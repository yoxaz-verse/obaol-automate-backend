// models/Tag.ts
import { Schema, model, Types } from "mongoose";

const TagSchema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export default model("Tag", TagSchema);

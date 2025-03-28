import { IQuantityUnit } from "../../interfaces/quantityUnit";
import mongoose, { Document, Schema } from "mongoose";

const QuantityUnitSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },

  createdAt: { type: Date, default: Date.now },
});

export const QuantityUnitModel = mongoose.model<IQuantityUnit>(
  "QuantityUnit",
  QuantityUnitSchema
);

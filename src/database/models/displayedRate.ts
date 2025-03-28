import mongoose, { Schema } from "mongoose";
import { IDisplayedRate } from "../../interfaces/displayedRate";

const DisplayedRateSchema: Schema = new Schema({
  variantRate: {
    type: Schema.Types.ObjectId,
    ref: "VariantRate",
    required: true,
  },
  commission: { type: Number },
  selected: { type: Boolean, default: false },
  associate: { type: Schema.Types.ObjectId, ref: "Associate", required: true },
});

export const DisplayedRateModel = mongoose.model<IDisplayedRate>(
  "DisplayedRate",
  DisplayedRateSchema
);

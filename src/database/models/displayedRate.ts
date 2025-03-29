import mongoose, { Schema } from "mongoose";
import { IDisplayedRate } from "../../interfaces/displayedRate";
import { AssociateModel } from "./associate"; // Adjust path to your Associate model

const DisplayedRateSchema: Schema = new Schema({
  variantRate: {
    type: Schema.Types.ObjectId,
    ref: "VariantRate",
    required: true,
  },
  commission: { type: Number },
  selected: { type: Boolean, default: false },
  associate: {
    type: Schema.Types.ObjectId,
    ref: "Associate",
    required: true,
  },
  associateCompany: {
    type: Schema.Types.ObjectId,
    ref: "AssociateCompany",
    required: false, // We'll set it automatically
  },
});

/**
 * Pre-save hook to automatically set `associateCompany`
 * based on the `associate` field.
 */
DisplayedRateSchema.pre<IDisplayedRate>("save", async function (next) {
  try {
    // only do this if `associate` is present/modified
    if (this.isModified("associate")) {
      // fetch the associate doc
      const assocDoc = await AssociateModel.findById(this.associate).select(
        "associateCompany"
      );
      if (!assocDoc) {
        throw new Error("Invalid `associate` – no such Associate found.");
      }
      // set the `associateCompany` from the associate doc
      this.associateCompany = assocDoc.associateCompany;
    }
    next();
  } catch {
    next();
  }
});

export const DisplayedRateModel = mongoose.model<IDisplayedRate>(
  "DisplayedRate",
  DisplayedRateSchema
);

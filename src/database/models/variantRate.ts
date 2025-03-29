import mongoose, { Schema } from "mongoose";
import { IVariantRate } from "../../interfaces/variantRate";
import { AssociateModel } from "./associate";

const VariantRateSchema: Schema = new Schema({
  rate: { type: Number, required: true },
  commission: { type: Number },
  selected: { type: Boolean, default: false },
  productVariant: {
    type: Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: true,
  },
  associate: { type: Schema.Types.ObjectId, ref: "Associate" },
  /**
   * We add associateCompany here.
   * It's required: false, because we'll fill it automatically via a pre-save hook.
   */
  associateCompany: {
    type: Schema.Types.ObjectId,
    ref: "AssociateCompany",
    required: false,
  },
  isLive: { type: Boolean, default: false },
  duration: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

/**
 * Pre-save hook to automatically set `associateCompany`
 * based on the `associate` reference.
 */
VariantRateSchema.pre<IVariantRate>("save", async function (next) {
  try {
    // Only do this if `associate` is set/modified
    if (this.isModified("associate") && this.associate) {
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

export const VariantRateModel = mongoose.model<IVariantRate>(
  "VariantRate",
  VariantRateSchema
);

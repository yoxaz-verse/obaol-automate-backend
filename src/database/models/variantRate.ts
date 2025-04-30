import mongoose, { Schema } from "mongoose";
import { IVariantRate } from "../../interfaces/variantRate";
import { AssociateModel } from "./associate";
import { Types } from "mongoose";

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
  associateCompany: {
    type: Schema.Types.ObjectId,
    ref: "AssociateCompany",
    required: false,
  },
  tags: [{ type: Types.ObjectId, ref: "Tag" }],
  isLive: { type: Boolean, default: false },
  duration: { type: Number, default: 1 }, // duration in days

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  lastEditTime: { type: Date },
  coolingStartTime: { type: Date },
  hiddenDraftOf: { type: Schema.Types.ObjectId, ref: "VariantRate" },

  // ✅ NEW FIELD
  lastLiveAt: { type: Date, default: null }, // ⏳ Tracks when isLive was turned true
});

/**
 * Pre-save hook to auto-populate associateCompany
 */
VariantRateSchema.pre<IVariantRate>("save", async function (next) {
  try {
    if (this.isModified("associate") && this.associate) {
      const assocDoc = await AssociateModel.findById(this.associate).select(
        "associateCompany"
      );
      if (!assocDoc) {
        throw new Error("Invalid `associate` – no such Associate found.");
      }
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

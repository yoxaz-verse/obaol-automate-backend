import mongoose, { Schema } from "mongoose";
import { IVariantRate } from "../../interfaces/variantRate";
import { AssociateModel } from "./associate";
import { Types } from "mongoose";
import { RelationshipSync } from "../../core/behaviors/relationshipSync";
import { TimeCalculations } from "../../core/behaviors/timeCalculations";
import { getVariantRateCommissionPercent } from "../../utils/calculationConfig";

const round2 = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const VariantRateSchema: Schema = new Schema({
  rate: { type: Number, required: true },
  commission: { type: Number },
  selected: { type: Boolean, default: false },
  productVariant: {
    type: Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: true,
  },
  state: { type: mongoose.Types.ObjectId, ref: "State" },
  district: { type: mongoose.Types.ObjectId, ref: "District" },
  division: { type: mongoose.Types.ObjectId, ref: "Division" },
  pincodeEntry: { type: mongoose.Types.ObjectId, ref: "PincodeEntry" },
  associate: { type: Schema.Types.ObjectId, ref: "Associate" },
  sourceInventory: { type: Schema.Types.ObjectId, ref: "Inventory", default: null },
  associateCompany: {
    type: Schema.Types.ObjectId,
    ref: "AssociateCompany",
    required: false,
  },
  locationSource: {
    type: String,
    enum: ["WAREHOUSE", "OFFICE_ADDRESS"],
    default: "WAREHOUSE",
    index: true,
  },
  warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", default: null },
  officeAddress: { type: String, default: "" },
  tags: [{ type: Types.ObjectId, ref: "Tag" }],
  isLive: { type: Boolean, default: false },
  duration: { type: Number, default: 1 }, // duration in days
  lastEditTime: { type: Date },
  coolingStartTime: { type: Date },
  hiddenDraftOf: { type: Schema.Types.ObjectId, ref: "VariantRate" },
  isDeleted: { type: Boolean, default: false, index: true },
  isDemo: { type: Boolean, default: false, index: true },
  demoTag: { type: String, default: null, index: true },
  demoCreatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  // ✅ NEW FIELD
  lastLiveAt: { type: Date, default: null }, // ⏳ Tracks when isLive was turned true
  lastLiveDate: { type: Date, default: null },
  unit: { type: String, default: 'KG', enum: ['KG', 'MT', 'Quintal'] },
}, { timestamps: true });

/**
 * Pre-save hook to auto-populate associateCompany
 */
VariantRateSchema.pre<IVariantRate>("save", async function (next) {
  try {
    if (
      RelationshipSync.shouldSyncAssociateCompany(
        this.isModified("associate"),
        this.associate
      )
    ) {
      const assocDoc = await AssociateModel.findById(this.associate).select(
        "associateCompany"
      );
      if (!assocDoc) {
        throw new Error("Invalid `associate` – no such Associate found.");
      }
      // Handle optional associateCompany field (can be null for new registrations)
      this.associateCompany = (assocDoc as any).associateCompany || undefined;
    }
    next();
  } catch {
    next();
  }
});
VariantRateSchema.pre<IVariantRate>("save", async function (next) {
  try {
    if (this.isModified("rate") || this.commission === undefined || this.commission === null) {
      const commissionPercent = await getVariantRateCommissionPercent();
      const commissionRate = Number.isFinite(commissionPercent) ? commissionPercent / 100 : 0.025;
      const nextCommission = round2(Number(this.rate || 0) * commissionRate);
      this.commission = nextCommission;
    }
    next();
  } catch {
    next();
  }
});
VariantRateSchema.pre<IVariantRate>("save", function (next) {
  if (this.isModified("isLive")) {
    const newDate = TimeCalculations.determineLastLiveAt(
      this.isLive,
      this.lastLiveAt || null
    );
    if (newDate) {
      this.lastLiveAt = newDate;
      this.lastLiveDate = newDate;
    }
  }
  next();
});

export const VariantRateModel = mongoose.model<IVariantRate>(
  "VariantRate",
  VariantRateSchema
);

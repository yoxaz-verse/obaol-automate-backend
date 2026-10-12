import mongoose, { Schema } from "mongoose";
import { IVariantRate } from "../../interfaces/variantRate";
import { AssociateModel } from "./associate";
import { Types } from "mongoose";
import { RelationshipSync } from "../../core/behaviors/relationshipSync";
import { TimeCalculations } from "../../core/behaviors/timeCalculations";
import { getVariantRateCommissionPercent } from "../../utils/calculationConfig";
import { AssociateReferralService } from "../../services/associateReferral.service";

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
  unpublishedAt: { type: Date, default: null, index: true },
  unit: { type: String, default: 'KG', enum: ['KG', 'MT', 'Quintal'] },
  isConventional: { type: Boolean, default: true, index: true },
  isNatural: { type: Boolean, default: false, index: true },
  isOrganic: { type: Boolean, default: false, index: true },
  isIpmQuality: { type: Boolean, default: false, index: true },
  isOrganicCertified: { type: Boolean, default: false },
  organicCertificationBody: { type: String, default: "", trim: true },
  organicCertificationBodyOther: { type: String, default: "", trim: true },
  organicCertificateNumber: { type: String, default: "", trim: true },
  organicCertificateValidFrom: { type: Date, default: null },
  organicCertificateValidTo: { type: Date, default: null },
  organicCertifiedQuantity: { type: Number, default: 0 },
  organicCertifiedQuantityUnit: { type: String, default: "KG", enum: ["KG", "MT", "Quintal"] },
  organicCertificationScope: { type: String, default: "NPOP", trim: true },
  organicCertificateDocumentUrl: { type: String, default: "", trim: true },
  isGiTagged: { type: Boolean, default: false, index: true },
  giName: { type: String, default: "", trim: true },
  giCertificateNumber: { type: String, default: "", trim: true },
  giDocumentUrl: { type: String, default: "", trim: true },
}, { timestamps: true });

// Marketplace query acceleration indexes
VariantRateSchema.index({ isDeleted: 1, associate: 1, isLive: 1, createdAt: -1 });
VariantRateSchema.index({ isDeleted: 1, associateCompany: 1, isLive: 1 });
VariantRateSchema.index({ isDeleted: 1, productVariant: 1, isLive: 1 });
VariantRateSchema.index({ isDeleted: 1, isLive: 1, lastLiveDate: 1, createdAt: -1 });
VariantRateSchema.index({ isDeleted: 1, isLive: 1, unpublishedAt: 1, createdAt: -1 });
VariantRateSchema.index({ isLive: 1, isDeleted: 1, isDemo: 1, productVariant: 1, associate: 1, associateCompany: 1 });
VariantRateSchema.index({ isDeleted: 1, isLive: 1, isConventional: 1, isNatural: 1, isOrganic: 1, isIpmQuality: 1, isGiTagged: 1 });

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
    const now = new Date();
    const newDate = TimeCalculations.determineLastLiveAt(this.isLive, this.lastLiveAt || null);
    if (newDate) {
      this.lastLiveAt = newDate;
      this.lastLiveDate = newDate;
      this.unpublishedAt = null;
    } else {
      this.unpublishedAt = now;
    }
  }
  next();
});
VariantRateSchema.post<IVariantRate>("save", async function (doc) {
  if (!doc.isLive) return;
  await AssociateReferralService.activateCompany(doc.associateCompany as any, "LIVE_SUPPLY", doc._id as any);
});

export const VariantRateModel = mongoose.model<IVariantRate>(
  "VariantRate",
  VariantRateSchema
);

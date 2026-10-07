import mongoose, { Schema } from "mongoose";

const RateRevealEventSchema = new Schema(
  {
    variantRate: { type: Schema.Types.ObjectId, ref: "VariantRate", required: true, index: true },
    viewerId: { type: Schema.Types.ObjectId, required: true, index: true },
    viewerRole: { type: String, required: true, lowercase: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
    viewerName: { type: String, default: "" },
    viewerEmail: { type: String, default: "" },
    viewerPhone: { type: String, default: "" },
    companyName: { type: String, default: "" },
    sessionId: { type: String, required: true, maxlength: 120 },
    listingWasLive: { type: Boolean, required: true, index: true },
    revealedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

RateRevealEventSchema.index(
  { variantRate: 1, viewerId: 1, sessionId: 1 },
  { unique: true }
);
RateRevealEventSchema.index({ revealedAt: -1, variantRate: 1 });

export const RateRevealEventModel = mongoose.model(
  "RateRevealEvent",
  RateRevealEventSchema
);

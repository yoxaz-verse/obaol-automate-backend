import mongoose, { Schema } from "mongoose";

export const LAB_CONTACT_CHANNELS = ["PHONE", "WHATSAPP", "EMAIL"] as const;

const LabContactEventSchema = new Schema({
  labProfileId: { type: Schema.Types.ObjectId, ref: "LabProfile", required: true, index: true },
  labCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  actorId: { type: Schema.Types.ObjectId, required: true, index: true },
  actorRole: { type: String, required: true, trim: true },
  channel: { type: String, enum: LAB_CONTACT_CHANNELS, required: true, index: true },
  firstClickedAt: { type: Date, default: Date.now },
  lastClickedAt: { type: Date, default: Date.now },
  clickCount: { type: Number, default: 1, min: 1 },
}, { timestamps: true });

LabContactEventSchema.index({ labProfileId: 1, actorId: 1, actorRole: 1, channel: 1 }, { unique: true });
LabContactEventSchema.index({ labCompanyId: 1, labProfileId: 1, channel: 1 });

export const LabContactEventModel = mongoose.model("LabContactEvent", LabContactEventSchema);

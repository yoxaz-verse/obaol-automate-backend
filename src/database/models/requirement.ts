import mongoose, { Schema } from "mongoose";
import { IRequirement, REQUIREMENT_ITEM_TYPES } from "../../interfaces/requirement";

const BidSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true },
  amount: { type: Number, min: 0, default: null },
  currency: { type: String, trim: true, uppercase: true, default: "INR" },
  note: { type: String, trim: true, maxlength: 2000, default: "" },
  status: { type: String, enum: ["SUBMITTED", "WITHDRAWN", "AWARDED", "NOT_SELECTED"], default: "SUBMITTED" },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true });

const ItemSchema = new Schema({
  type: { type: String, enum: REQUIREMENT_ITEM_TYPES, required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  specifications: { type: Schema.Types.Mixed, default: {} },
  fulfilmentMethod: { type: String, enum: ["MATCHED_BIDDING", "INVITE_ONLY", "DIRECT_ASSIGN"], default: "MATCHED_BIDDING" },
  status: { type: String, enum: ["DRAFT", "OPEN", "AWARDED", "IN_EXECUTION", "COMPLETED", "CANCELLED"], default: "DRAFT" },
  invitedCompanyIds: [{ type: Schema.Types.ObjectId, ref: "AssociateCompany" }],
  candidateCompanyIds: [{ type: Schema.Types.ObjectId, ref: "AssociateCompany" }],
  preferredProviderCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null },
  preferredVehicleId: { type: Schema.Types.ObjectId, ref: "InlandVehicle", default: null },
  bids: { type: [BidSchema], default: [] },
  awardedCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null },
  awardedAt: { type: Date, default: null },
  linkedEntityType: { type: String, default: null },
  linkedEntityId: { type: Schema.Types.ObjectId, default: null },
}, { _id: true });

const RequirementSchema = new Schema<IRequirement>({
  reference: { type: String, required: true, unique: true, index: true },
  mode: { type: String, enum: ["TRADE", "SERVICE_ONLY"], required: true, index: true },
  journeyType: { type: String, enum: ["BUY_PRODUCT", "HIRE_SERVICE", "TRACK_EXISTING"], default: "HIRE_SERVICE", index: true },
  serviceCategory: { type: String, trim: true, default: "" },
  customServiceName: { type: String, trim: true, maxlength: 160, default: "" },
  title: { type: String, required: true, trim: true, maxlength: 240 },
  description: { type: String, trim: true, maxlength: 5000, default: "" },
  status: { type: String, enum: ["DRAFT", "PUBLISHED", "SOURCING", "PARTIALLY_AWARDED", "AWARDED", "IN_EXECUTION", "COMPLETED", "CANCELLED"], default: "DRAFT", index: true },
  visibility: { type: String, enum: ["MATCHED", "INVITE_ONLY", "PRIVATE"], default: "MATCHED" },
  identityVisibility: { type: String, enum: ["IMMEDIATE", "AFTER_AWARD", "PRIVATE"], default: "AFTER_AWARD" },
  fulfilmentStrategy: { type: String, enum: ["MATCHED_BIDDING", "INVITE_ONLY", "DIRECT_ASSIGN", "TRACK_ONLY"], default: "MATCHED_BIDDING" },
  budget: { amount: { type: Number, min: 0, default: null }, currency: { type: String, uppercase: true, trim: true, default: "INR" }, flexible: { type: Boolean, default: true } },
  urgency: { type: String, enum: ["FLEXIBLE", "STANDARD", "URGENT"], default: "STANDARD" },
  parties: { type: Schema.Types.Mixed, default: {} },
  trackingPlan: {
    planKey: { type: String, trim: true, default: "" }, label: { type: String, trim: true, default: "" },
    feeAmount: { type: Number, min: 0, default: null }, currency: { type: String, uppercase: true, trim: true, default: "INR" },
    acceptedAt: { type: Date, default: null }, activationStatus: { type: String, enum: ["NOT_REQUIRED", "PENDING", "ACTIVE", "REJECTED"], default: "NOT_REQUIRED" },
  },
  createdBy: { type: Schema.Types.ObjectId, required: true, index: true },
  ownerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
  product: { name: String, variant: String, quantity: Number, unit: String },
  route: { type: Schema.Types.Mixed, default: {} },
  targetDate: { type: Date, default: null },
  attachments: [{ name: { type: String, trim: true }, url: { type: String, trim: true } }],
  items: { type: [ItemSchema], validate: [(value: unknown[]) => value.length > 0, "At least one requirement item is required."] },
  activity: [{ action: { type: String, required: true }, actorId: { type: Schema.Types.ObjectId, required: true }, at: { type: Date, default: Date.now }, metadata: Schema.Types.Mixed }],
  stages: [{
    key: { type: String, required: true }, label: { type: String, required: true, trim: true }, description: { type: String, default: "" }, sortOrder: { type: Number, required: true },
    ownerRole: { type: String, default: "PROVIDER" }, expectedAt: { type: Date, default: null }, status: { type: String, enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "SKIPPED"], default: "PENDING" },
    evidenceUrls: [{ type: String, trim: true }], notes: { type: String, default: "" }, completedAt: { type: Date, default: null }, updatedBy: { type: Schema.Types.ObjectId, default: null },
  }],
  conversation: [{ authorId: { type: Schema.Types.ObjectId, required: true }, authorRole: String, body: { type: String, required: true, trim: true, maxlength: 4000 }, attachmentUrls: [String], visibility: { type: String, enum: ["ALL_PARTICIPANTS", "REQUESTER_INTERNAL"], default: "ALL_PARTICIPANTS" }, createdAt: { type: Date, default: Date.now } }],
  legacy: { type: { type: String, enum: ["EXTERNAL_ORDER", "ENQUIRY"] }, id: Schema.Types.ObjectId },
}, { timestamps: true });

RequirementSchema.index({ ownerCompanyId: 1, updatedAt: -1 });
RequirementSchema.index({ "items.candidateCompanyIds": 1, "items.status": 1 });
RequirementSchema.index({ "items.invitedCompanyIds": 1, "items.status": 1 });

export const RequirementModel = mongoose.model<IRequirement>("Requirement", RequirementSchema);

import mongoose, { Schema } from "mongoose";

export const ASSOCIATE_ROLE_SLUGS = [
  "traders", "importers", "exporters", "suppliers", "procurement-partners",
  "warehouse-owners", "inland-transportation", "freight-forwarders",
  "logistics-providers", "packaging-companies", "quality-testing-labs",
  "customs-clearance-agencies", "finance-partners", "insurance-partners",
  "agritech-companies",
] as const;

export const SCENARIO_ROLE_SLUGS = [...ASSOCIATE_ROLE_SLUGS, "operator"] as const;

export const SCENARIO_BLOCK_TYPES = [
  "heading", "paragraph", "ordered-list", "unordered-list", "quote", "callout",
  "image", "workflow", "result", "faq", "cta",
] as const;

const ScenarioBlockSchema = new Schema({
  type: { type: String, enum: SCENARIO_BLOCK_TYPES, required: true },
  level: { type: Number, enum: [2, 3, 4] },
  text: { type: String, maxlength: 5000 },
  items: [{ type: String, maxlength: 1000 }],
  imageUrl: { type: String, maxlength: 2000 },
  imageAlt: { type: String, maxlength: 300 },
  title: { type: String, maxlength: 300 },
  href: { type: String, maxlength: 2000 },
}, { _id: true });

const FaqSchema = new Schema({
  question: { type: String, required: true, maxlength: 500 },
  answer: { type: String, required: true, maxlength: 3000 },
}, { _id: false });

const RealLifeScenarioSchema = new Schema({
  seedKey: { type: String, trim: true, select: false },
  seedVersion: { type: Number, min: 1, select: false },
  internalTitle: { type: String, required: true, trim: true, maxlength: 200 },
  h1: { type: String, required: true, trim: true, maxlength: 200 },
  roleSlug: { type: String, required: true, enum: SCENARIO_ROLE_SLUGS, index: true },
  slug: { type: String, required: true, trim: true, maxlength: 180 },
  excerpt: { type: String, required: true, trim: true, maxlength: 500 },
  scenarioType: { type: String, enum: ["REPRESENTATIVE"], default: "REPRESENTATIVE" },
  disclosureAccepted: { type: Boolean, default: false },
  blocks: { type: [ScenarioBlockSchema], default: [] },
  primaryKeyword: { type: String, trim: true, maxlength: 160 },
  supportingKeywords: [{ type: String, trim: true, maxlength: 160 }],
  audienceIntent: { type: String, trim: true, maxlength: 500 },
  seoTitle: { type: String, trim: true, maxlength: 200 },
  seoDescription: { type: String, trim: true, maxlength: 500 },
  heroImageUrl: { type: String, trim: true, maxlength: 2000 },
  heroImageAlt: { type: String, trim: true, maxlength: 300 },
  faqs: { type: [FaqSchema], default: [] },
  cta: {
    label: { type: String, trim: true, maxlength: 120 },
    href: { type: String, trim: true, maxlength: 2000 },
  },
  displayOrder: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true },
  scheduledAt: { type: Date, default: null },
  publishedAt: { type: Date, default: null },
  previewTokenHash: { type: String, default: null, select: false },
  previewExpiresAt: { type: Date, default: null, select: false },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

RealLifeScenarioSchema.index({ roleSlug: 1, slug: 1 }, { unique: true });
RealLifeScenarioSchema.index({ seedKey: 1 }, { unique: true, sparse: true });
RealLifeScenarioSchema.index({ roleSlug: 1, status: 1, displayOrder: 1 });
RealLifeScenarioSchema.index({ internalTitle: "text", h1: "text", excerpt: "text", primaryKeyword: "text" });

export const RealLifeScenarioModel: mongoose.Model<any> =
  (mongoose.models.RealLifeScenario as mongoose.Model<any>) || mongoose.model<any>("RealLifeScenario", RealLifeScenarioSchema);

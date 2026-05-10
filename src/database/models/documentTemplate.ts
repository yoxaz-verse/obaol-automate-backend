import mongoose, { Schema } from "mongoose";
import { IDocumentTemplate } from "../../interfaces/documentTemplate";

const TypographySchema = new Schema(
  {
    fontSize: { type: Number, default: 12 },
    fontWeight: { type: Number, default: 500 },
    color: { type: String, default: "#111827" },
    textAlign: { type: String, enum: ["left", "center", "right"], default: "left" },
  },
  { _id: false }
);

const BindingSchema = new Schema(
  {
    bindingType: { type: String, enum: ["SYSTEM_TOKEN", "MANUAL_FIELD"], default: "SYSTEM_TOKEN" },
    token: { type: String, default: "" },
    fieldKey: { type: String, default: "" },
    required: { type: Boolean, default: false },
    defaultValue: { type: String, default: "" },
    format: { type: String, default: "" },
  },
  { _id: false }
);

const BlockSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["HEADER", "PARTIES", "LINE_ITEMS", "TOTALS", "TERMS", "CERTIFICATE", "SHIPPING", "TEXT"],
      required: true,
    },
    label: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    visible: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1 },
    locked: { type: Boolean, default: false },
    bindingKey: { type: String, default: "" },
    typography: { type: TypographySchema, default: {} },
  },
  { _id: false }
);

const ElementSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["TEXT", "IMAGE", "SHAPE", "LINE", "TABLE", "SIGNATURE", "MANUAL_INPUT"],
      required: true,
    },
    label: { type: String, default: "" },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    visible: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1 },
    locked: { type: Boolean, default: false },
    content: { type: String, default: "" },
    src: { type: String, default: "" },
    style: { type: Schema.Types.Mixed, default: {} },
    typography: { type: TypographySchema, default: {} },
    binding: { type: BindingSchema, default: {} },
  },
  { _id: false }
);

const LayoutSchema = new Schema(
  {
    version: { type: Number, default: 2 },
    page: {
      size: { type: String, enum: ["A4"], default: "A4" },
      width: { type: Number, default: 794 },
      height: { type: Number, default: 1123 },
      marginTop: { type: Number, default: 24 },
      marginRight: { type: Number, default: 24 },
      marginBottom: { type: Number, default: 24 },
      marginLeft: { type: Number, default: 24 },
      orientation: { type: String, enum: ["PORTRAIT", "LANDSCAPE"], default: "PORTRAIT" },
    },
    grid: {
      size: { type: Number, default: 8 },
      snap: { type: Boolean, default: true },
    },
    blocks: { type: [BlockSchema], default: [] },
    elements: { type: [ElementSchema], default: [] },
  },
  { _id: false }
);

const ManualFieldSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    defaultValue: { type: String, default: "" },
  },
  { _id: false }
);

const DocumentTemplateSchema: Schema = new Schema(
  {
    docType: { type: String, index: true },
    documentType: { type: String, required: true, index: true },
    category: { type: String, enum: ["TRADE", "LEGAL", "GENERAL"], default: "TRADE", index: true },
    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT", index: true },
    stage: { type: String, enum: ["DRAFT", "PREVIEW", "LIVE"], default: "DRAFT", index: true },
    version: { type: Number, default: 1 },
    scope: { type: String, enum: ["GLOBAL", "COMPANY_OVERRIDE"], default: "GLOBAL", index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
    activationMode: { type: String, enum: ["IMMEDIATE", "SCHEDULED"], default: "IMMEDIATE" },
    activationAt: { type: Date, default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    layoutSchema: { type: LayoutSchema, required: true },
    letterheadConfig: {
      enabled: { type: Boolean, default: false },
      presetId: { type: Schema.Types.ObjectId, ref: "LetterheadPreset", default: null },
      firstPageOnly: { type: Boolean, default: true },
      watermark: { type: String, default: "" },
    },
    bindingConfig: {
      tokenMap: { type: Schema.Types.Mixed, default: {} },
      manualFields: { type: [ManualFieldSchema], default: [] },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

DocumentTemplateSchema.index({ documentType: 1, scope: 1, companyId: 1, stage: 1, isDeleted: 1, isActive: 1 });
DocumentTemplateSchema.index({ docType: 1, status: 1, isDeleted: 1, isActive: 1 });

export const DocumentTemplateModel = mongoose.model<IDocumentTemplate>("DocumentTemplate", DocumentTemplateSchema);

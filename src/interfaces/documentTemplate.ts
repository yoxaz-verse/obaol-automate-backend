import { Document, Types } from "mongoose";

export type DocumentTemplateStatus = "DRAFT" | "PUBLISHED";
export type DocumentTemplateOrientation = "PORTRAIT" | "LANDSCAPE";
export type DocumentTemplateScope = "GLOBAL" | "COMPANY_OVERRIDE";
export type DocumentTemplateStage = "DRAFT" | "PREVIEW" | "LIVE";
export type DocumentTemplateActivationMode = "IMMEDIATE" | "SCHEDULED";

export type DocumentTemplateBlockType =
  | "HEADER"
  | "PARTIES"
  | "LINE_ITEMS"
  | "TOTALS"
  | "TERMS"
  | "CERTIFICATE"
  | "SHIPPING"
  | "TEXT";

export type DocumentTemplateElementType =
  | "TEXT"
  | "IMAGE"
  | "SHAPE"
  | "LINE"
  | "TABLE"
  | "SIGNATURE"
  | "MANUAL_INPUT";

export interface IDocumentTemplateTypography {
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: "left" | "center" | "right";
}

export interface IDocumentTemplateFieldBinding {
  bindingType?: "SYSTEM_TOKEN" | "MANUAL_FIELD";
  token?: string;
  fieldKey?: string;
  required?: boolean;
  defaultValue?: string;
  format?: string;
}

export interface IDocumentTemplateBlock {
  id: string;
  type: DocumentTemplateBlockType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  zIndex?: number;
  locked?: boolean;
  bindingKey?: string;
  typography?: IDocumentTemplateTypography;
}

export interface IDocumentTemplateElement {
  id: string;
  type: DocumentTemplateElementType;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
  zIndex?: number;
  locked?: boolean;
  content?: string;
  src?: string;
  style?: Record<string, any>;
  typography?: IDocumentTemplateTypography;
  binding?: IDocumentTemplateFieldBinding;
}

export interface IDocumentTemplatePage {
  size: "A4";
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  orientation: DocumentTemplateOrientation;
}

export interface IDocumentTemplateLayoutSchema {
  version: number;
  page: IDocumentTemplatePage;
  grid: {
    size: number;
    snap: boolean;
  };
  blocks: IDocumentTemplateBlock[];
  elements?: IDocumentTemplateElement[];
}

export interface IDocumentTemplateLetterheadConfig {
  enabled?: boolean;
  presetId?: Types.ObjectId | null;
  firstPageOnly?: boolean;
  watermark?: string;
}

export interface IDocumentTemplateBindingConfig {
  tokenMap?: Record<string, string>;
  manualFields?: Array<{
    key: string;
    label: string;
    required?: boolean;
    defaultValue?: string;
  }>;
}

export interface IDocumentTemplate extends Document {
  docType?: string; // legacy alias
  documentType: string;
  category?: "TRADE" | "LEGAL" | "GENERAL";
  status: DocumentTemplateStatus;
  stage?: DocumentTemplateStage;
  version: number;
  scope?: DocumentTemplateScope;
  companyId?: Types.ObjectId | null;
  activationMode?: DocumentTemplateActivationMode;
  activationAt?: Date | null;
  isActive: boolean;
  layoutSchema: IDocumentTemplateLayoutSchema;
  letterheadConfig?: IDocumentTemplateLetterheadConfig;
  bindingConfig?: IDocumentTemplateBindingConfig;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

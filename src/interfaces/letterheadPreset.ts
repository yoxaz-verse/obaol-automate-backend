import { Document, Types } from "mongoose";

export interface ILetterheadPreset extends Document {
  name: string;
  scope: "GLOBAL" | "COMPANY_OVERRIDE";
  companyId?: Types.ObjectId | null;
  logoUrl?: string;
  headerHtml?: string;
  footerHtml?: string;
  watermark?: string;
  spacing?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

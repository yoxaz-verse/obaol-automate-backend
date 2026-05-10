import { Document } from "mongoose";

export type DocumentTypeCategory = "TRADE" | "LEGAL" | "GENERAL";

export interface IDocumentType extends Document {
  slug: string;
  label: string;
  category: DocumentTypeCategory;
  icon?: string;
  defaultPageSetup?: {
    size?: "A4";
    orientation?: "PORTRAIT" | "LANDSCAPE";
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
  };
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

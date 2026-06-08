import { Document, Types } from "mongoose";

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  slug?: string;
  description: string;
  subCategory: Types.ObjectId;
  state?: Types.ObjectId[];
  isConventional?: boolean;
  isNatural?: boolean;
  isOrganic?: boolean;
  isIpmQuality?: boolean;
  isOrganicCertified?: boolean;
  organicCertificationBody?: string;
  organicCertificationBodyOther?: string;
  organicCertificateNumber?: string;
  organicCertificateValidFrom?: Date | null;
  organicCertificateValidTo?: Date | null;
  organicCertifiedQuantity?: number;
  organicCertifiedQuantityUnit?: "KG" | "MT" | "Quintal";
  organicCertificationScope?: "NPOP" | "PGS-India" | "NOP" | "EU" | "Other";
  organicCertificateDocumentUrl?: string;
  isGiTagged?: boolean;
  giName?: string;
  giCertificateNumber?: string;
  giDocumentUrl?: string;
}

export interface ICreateProduct {
  name: string;
  slug?: string;
  description: string;
  subCategory: Types.ObjectId;
  state?: Types.ObjectId[];
  isConventional?: boolean;
  isNatural?: boolean;
  isOrganic?: boolean;
  isIpmQuality?: boolean;
  isOrganicCertified?: boolean;
  organicCertificationBody?: string;
  organicCertificationBodyOther?: string;
  organicCertificateNumber?: string;
  organicCertificateValidFrom?: Date | null;
  organicCertificateValidTo?: Date | null;
  organicCertifiedQuantity?: number;
  organicCertifiedQuantityUnit?: "KG" | "MT" | "Quintal";
  organicCertificationScope?: "NPOP" | "PGS-India" | "NOP" | "EU" | "Other";
  organicCertificateDocumentUrl?: string;
  isGiTagged?: boolean;
  giName?: string;
  giCertificateNumber?: string;
  giDocumentUrl?: string;
}

export interface IUpdateProduct {
  name?: string;
  slug?: string;
  description?: string;
  subCategory?: Types.ObjectId;
  state?: Types.ObjectId[];
  isConventional?: boolean;
  isNatural?: boolean;
  isOrganic?: boolean;
  isIpmQuality?: boolean;
  isOrganicCertified?: boolean;
  organicCertificationBody?: string;
  organicCertificationBodyOther?: string;
  organicCertificateNumber?: string;
  organicCertificateValidFrom?: Date | null;
  organicCertificateValidTo?: Date | null;
  organicCertifiedQuantity?: number;
  organicCertifiedQuantityUnit?: "KG" | "MT" | "Quintal";
  organicCertificationScope?: "NPOP" | "PGS-India" | "NOP" | "EU" | "Other";
  organicCertificateDocumentUrl?: string;
  isGiTagged?: boolean;
  giName?: string;
  giCertificateNumber?: string;
  giDocumentUrl?: string;
}

import { Document, Types } from "mongoose";

/**
 * Represents a single Enquiry.
 */
export interface IEnquiry extends Document {
  phoneNumber: string;
  name: string;
  email?: string;
  specification?: string;
  quantity?: number;
  quantityUnit?: string;
  variantRate: Types.ObjectId; // Required
  displayRate?: Types.ObjectId | null; // Can be null
  productVariant: Types.ObjectId; // Required
  mediatorAssociate?: Types.ObjectId | null; // Can be null
  productAssociate: Types.ObjectId; // Required
  createdAt?: Date;
  rate?: number;
  status: string;

  associateCompany?: Types.ObjectId;
  commission?: number;
  mediatorCommission?: number;
}

/**
 * Create DTO for new Enquiry.
 */
export interface ICreateEnquiry {
  phoneNumber: string;
  name: string;
  email?: string;
  specification?: string;
  quantity?: number;
  quantityUnit?: string;
  variantRate: Types.ObjectId;
  displayRate?: Types.ObjectId | null;
  productVariant: Types.ObjectId;
  mediatorAssociate?: Types.ObjectId | null;
  productAssociate: Types.ObjectId;
  associateCompany?: Types.ObjectId;
  rate?: number;
  commission?: number;
  mediatorCommission?: number;
}

/**
 * Update DTO (all optional).
 */
export interface IUpdateEnquiry {
  phoneNumber?: string;
  name?: string;
  email?: string;
  quantity?: number;
  quantityUnit?: string;
  specification?: string;
  variantRate?: Types.ObjectId;
  displayRate?: Types.ObjectId | null;
  productVariant?: Types.ObjectId;
  mediatorAssociate?: Types.ObjectId | null;
  productAssociate?: Types.ObjectId;
  status?: string;
  associateCompany?: Types.ObjectId;
  rate?: number;
  commission?: number;
  mediatorCommission?: number;
}

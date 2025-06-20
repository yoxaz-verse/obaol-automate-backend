import { Document, Types } from "mongoose";

/**
 * Represents a single Enquiry.
 */
export interface IEnquiry extends Document {
  phoneNumber: string;
  name: string;
  specification?: string;
  quantity?: string;
  quantityUnit?: Types.ObjectId; // Required
  variantRate: Types.ObjectId; // Required
  displayRate?: Types.ObjectId | null; // Can be null
  productVariant: Types.ObjectId; // Required
  mediatorAssociate?: Types.ObjectId | null; // Can be null
  productAssociate: Types.ObjectId; // Required
  createdAt?: Date;
  rate?: number;
  status: String;
  commission?: number;
  mediatorCommission?: number;
}

/**
 * Create DTO for new Enquiry.
 */
export interface ICreateEnquiry {
  phoneNumber: string;
  name: string;
  specification?: string;
  quantity?: string;
  quantityUnit?: Types.ObjectId; // Required
  variantRate: Types.ObjectId;
  displayRate?: Types.ObjectId | null;
  productVariant: Types.ObjectId;
  mediatorAssociate?: Types.ObjectId | null;
  productAssociate: Types.ObjectId;
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
  quantity?: string;
  quantityUnit?: Types.ObjectId; // Required
  specification?: string;
  variantRate?: Types.ObjectId;
  displayRate?: Types.ObjectId | null;
  productVariant?: Types.ObjectId;
  mediatorAssociate?: Types.ObjectId | null;
  productAssociate?: Types.ObjectId;
  status: String;
  rate?: number;
  commission?: number;
  mediatorCommission?: number;
}

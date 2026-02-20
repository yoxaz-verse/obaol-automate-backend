import { Document, Types } from "mongoose";
import { InquiryStatus } from "../core/inquiry/inquiryStateMachine";

/**
 * Clean Inquiry Interface
 */
export interface IInquiry extends Document {
  // Product details
  productId: Types.ObjectId;
  quantity?: number;
  specifications?: string;

  // Associate roles
  buyerAssociateId: Types.ObjectId;
  sellerAssociateId: Types.ObjectId;
  mediatorAssociateId?: Types.ObjectId | null;

  // Internal assignment
  assignedEmployeeId?: Types.ObjectId | null;

  // Status management
  status: InquiryStatus;

  // Internal notes (hidden from associates)
  notes?: string;

  // Audit fields
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create DTO for new Inquiry
 */
export interface ICreateInquiry {
  productId: Types.ObjectId;
  quantity?: number;
  specifications?: string;
  buyerAssociateId: Types.ObjectId;
  sellerAssociateId: Types.ObjectId;
  mediatorAssociateId?: Types.ObjectId | null;
  assignedEmployeeId?: Types.ObjectId | null;
  notes?: string;
  createdBy: Types.ObjectId;
}

/**
 * Update DTO (limited fields allowed to be updated)
 */
export interface IUpdateInquiry {
  quantity?: number;
  specifications?: string;
  buyerAssociateId?: Types.ObjectId;
  sellerAssociateId?: Types.ObjectId;
  mediatorAssociateId?: Types.ObjectId | null;
  notes?: string;
}

/**
 * Legacy field mapping for backward compatibility
 * DO NOT USE - for migration reference only
 */
export interface ILegacyEnquiry {
  phoneNumber?: string;
  name?: string;
  email?: string;
  specification?: string;
  quantity?: number;
  quantityUnit?: string;
  variantRate?: Types.ObjectId;
  displayRate?: Types.ObjectId | null;
  productVariant?: Types.ObjectId;
  mediatorAssociate?: Types.ObjectId | null;
  productAssociate?: Types.ObjectId;
  rate?: number;
  status?: string;
  associateCompany?: Types.ObjectId;
  commission?: number;
  mediatorCommission?: number;
}

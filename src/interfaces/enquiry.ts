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
  packagingSpecifications?: string;
  variantRateId?: Types.ObjectId | null;
  catalogItemId?: Types.ObjectId | null;

  // Associate roles
  buyerAssociateId: Types.ObjectId;
  sellerAssociateId: Types.ObjectId;
  mediatorAssociateId?: Types.ObjectId | null;

  // Commercial terms
  preferredIncoterm?: Types.ObjectId | null;
  supplierCommitUntil?: Date | null;

  // Acceptance markers
  sellerAcceptedAt?: Date | null;
  buyerConfirmedAt?: Date | null;

  // Internal assignment
  assignedOperatorId?: Types.ObjectId | null;
  order?: Types.ObjectId | null;
  responsibilityPlan?: {
    procurementBy?: "buyer" | "seller" | "obaol";
    certificateBy?: "buyer" | "seller" | "obaol";
    transportBy?: "buyer" | "seller" | "obaol";
    shippingBy?: "buyer" | "seller" | "obaol";
    packagingBy?: "buyer" | "seller" | "obaol";
    qualityTestingBy?: "buyer" | "seller" | "obaol";
    cargoInsuranceBy?: "buyer" | "seller" | "obaol";
    exportCustomsBy?: "buyer" | "seller" | "obaol";
    importCustomsBy?: "buyer" | "obaol";
    dutiesTaxesBy?: "buyer";
    portHandlingBy?: "buyer" | "obaol";
    destinationInlandTransportBy?: "buyer" | "obaol";
    destinationInspectionBy?: "buyer" | "obaol";
    finalDeliveryConfirmationBy?: "obaol";
  };
  executionContext?: {
    tradeType?: "DOMESTIC" | "INTERNATIONAL";
    originCountry?: string;
    originState?: string;
    originDistrict?: string;
    originPort?: string;
    destinationCountry?: string;
    destinationState?: string;
    destinationDistrict?: string;
    destinationPort?: string;
    routeNotes?: string;
  };
  responsibilitiesFinalizedAt?: Date | null;
  executionInquiries?: Array<{
    type: "PROCUREMENT" | "CERTIFICATION" | "TRANSPORTATION" | "SHIPPING" | "PACKAGING" | "QUALITY_TESTING";
    ownerBy: "buyer" | "seller" | "obaol";
    status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
    title: string;
    details?: {
      tradeType?: "DOMESTIC" | "INTERNATIONAL";
      from?: string;
      to?: string;
      routeNotes?: string;
      requiresShipping?: boolean;
      fromState?: string | null;
      fromDistrict?: string | null;
      packagingSpecifications?: string | null;
    };
    candidateProviders?: Array<Types.ObjectId | string>;
    bids?: Array<{
      company: Types.ObjectId | string;
      amount?: number;
      note?: string;
      status?: "OPEN" | "SUBMITTED" | "WITHDRAWN" | "AWARDED";
      createdBy?: Types.ObjectId | string | null;
      createdAt?: Date;
      updatedAt?: Date;
    }>;
    committedProvider?: Types.ObjectId | string | null;
    bidAmount?: number;
    commitNote?: string;
    committedAt?: Date | null;
    createdAt: Date;
  }>;

  // Status management
  status: InquiryStatus;
  workflowStage?: string;
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;

  // Financials & Commissions
  rate?: number;
  adminCommission?: number;
  mediatorCommission?: number;

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
  packagingSpecifications?: string;
  buyerAssociateId: Types.ObjectId;
  sellerAssociateId: Types.ObjectId;
  mediatorAssociateId?: Types.ObjectId | null;
  assignedOperatorId?: Types.ObjectId | null;
  preferredIncoterm?: Types.ObjectId | null;
  supplierCommitUntil?: Date | null;
  rate?: number;
  adminCommission?: number;
  mediatorCommission?: number;
  notes?: string;
  workflowStage?: string;
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;
  createdBy: Types.ObjectId;
}

/**
 * Update DTO (limited fields allowed to be updated)
 */
export interface IUpdateInquiry {
  quantity?: number;
  specifications?: string;
  packagingSpecifications?: string;
  buyerAssociateId?: Types.ObjectId;
  sellerAssociateId?: Types.ObjectId;
  mediatorAssociateId?: Types.ObjectId | null;
  preferredIncoterm?: Types.ObjectId | null;
  supplierCommitUntil?: Date | null;
  notes?: string;
  workflowStage?: string;
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;
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

import { Document, Types } from "mongoose";

export type TradeDocumentType =
  | "LOI"
  | "QUOTATION"
  | "PROFORMA_INVOICE"
  | "INVOICE"
  | "PURCHASE_ORDER"
  | "SALES_CONTRACT"
  | "PACKING_LIST"
  | "QUALITY_CERTIFICATE"
  | "INSPECTION_CERTIFICATE"
  | "PHYTOSANITARY_CERTIFICATE"
  | "FUMIGATION_CERTIFICATE"
  | "BILL_OF_LADING"
  | "AIR_WAYBILL"
  | "INSURANCE_CERTIFICATE"
  | "PAYMENT_ADVICE"
  | "LORRY_RECEIPT"
  | "LCL_DRAFT"
  | "SHIPPING_BILL"
  | "CERTIFICATE_OF_ORIGIN"
  | "DISPATCH_CHALLAN"
  | "BILL_OF_ENTRY"
  | "CUSTOMS_CLEARANCE"
  | "GOODS_RECEIPT";
export type TradeDocumentStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED";
export type TradeDocumentVerifiedStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type TradeDocumentAudienceScope = "SELLER_OBAOL" | "OBAOL_BUYER";
export type TradeDocumentSourceMode = "CREATED" | "UPLOADED";
export type TradeDocumentExtractionStatus = "NOT_REQUIRED" | "QUEUED" | "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETED" | "FAILED";

export interface ITradeDocumentPartySnapshot {
  associateId?: Types.ObjectId | null;
  companyId?: Types.ObjectId | null;
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  logo?: string;
}

export interface ITradeDocumentLineItem {
  productId?: Types.ObjectId | null;
  productName?: string;
  productVariantId?: Types.ObjectId | null;
  productVariantName?: string;
  quantityMT?: number;
  quantityKG?: number;
  unit?: string; // quantity unit
  ratePerKg?: number;
  commissionPerKg?: number;
  amount?: number; // subtotal for item (ratePerKg * quantityKG)
  description?: string;
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
}

export interface ITradeDocumentTotals {
  currency?: string;
  subtotal?: number;
  commissionTotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal?: number;
}

export interface ITradeDocumentTerms {
  incotermId?: Types.ObjectId | null;
  incotermCode?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  termsAndConditions?: string;
  notes?: string;
}

export interface ITradeDocument extends Document {
  ownerCompanyId?: Types.ObjectId | null;
  customerId?: Types.ObjectId | null;
  type: TradeDocumentType;
  status: TradeDocumentStatus;
  documentNumber: string;
  revision?: number;
  revisionOf?: Types.ObjectId | null;
  revisionOpenKey?: string | null;
  sourceQuotationId?: Types.ObjectId | null;
  sourceDocumentId?: Types.ObjectId | null;
  conversionRuleId?: Types.ObjectId | null;
  issueDate?: Date;
  validUntil?: Date | null;
  dueDate?: Date | null;
  templateSnapshot?: unknown;
  selectedTemplateId?: Types.ObjectId | null;
  selectedTemplateVersion?: number | null;
  documentData?: Record<string, unknown>;
  inviteIdempotencyKey?: string | null;
  inviteExpiresAt?: Date | null;
  inviteRevokedAt?: Date | null;
  invitationSentAt?: Date | null;
  firstViewedAt?: Date | null;
  lastViewedAt?: Date | null;
  viewCount?: number;
  lastDownloadedAt?: Date | null;
  downloadCount?: number;
  fileUrl?: string | null;
  sourceMode?: TradeDocumentSourceMode;
  originalFileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  extractionJobId?: Types.ObjectId | null;
  extractionStatus?: TradeDocumentExtractionStatus;
  extractionReviewedAt?: Date | null;
  extractionReviewedBy?: Types.ObjectId | null;
  uploadedBy?: Types.ObjectId | null;
  verifiedStatus?: TradeDocumentVerifiedStatus;
  enquiryId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  inventoryReservationId?: Types.ObjectId | null;
  buyer: ITradeDocumentPartySnapshot;
  seller: ITradeDocumentPartySnapshot;
  lineItems: ITradeDocumentLineItem[];
  totals: ITradeDocumentTotals;
  terms: ITradeDocumentTerms;
  createdBy?: Types.ObjectId | null;
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;
  isDeleted?: boolean;
  audienceScope?: TradeDocumentAudienceScope;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateTradeDocument {
  type: TradeDocumentType;
  enquiryId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  inventoryReservationId?: Types.ObjectId | null;
  status?: TradeDocumentStatus;
  fileUrl?: string | null;
  uploadedBy?: Types.ObjectId | null;
  verifiedStatus?: TradeDocumentVerifiedStatus;
  terms?: ITradeDocumentTerms;
  totals?: ITradeDocumentTotals;
  lineItems?: ITradeDocumentLineItem[];
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;
  audienceScope?: TradeDocumentAudienceScope;
}

export interface IUpdateTradeDocument {
  status?: TradeDocumentStatus;
  fileUrl?: string | null;
  verifiedStatus?: TradeDocumentVerifiedStatus;
  uploadedBy?: Types.ObjectId | null;
  terms?: ITradeDocumentTerms;
  totals?: ITradeDocumentTotals;
  orderId?: Types.ObjectId | null;
  isDemo?: boolean;
  demoTag?: string;
  demoCreatedBy?: Types.ObjectId | null;
  audienceScope?: TradeDocumentAudienceScope;
}

import { Document, Types } from "mongoose";

export type TradeDocumentType =
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
  | "PAYMENT_ADVICE";
export type TradeDocumentStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED";
export type TradeDocumentVerifiedStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface ITradeDocumentPartySnapshot {
  associateId?: Types.ObjectId | null;
  companyId?: Types.ObjectId | null;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
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
}

export interface ITradeDocumentTotals {
  currency?: string;
  subtotal?: number;
  commissionTotal?: number;
  taxAmount?: number;
  grandTotal?: number;
}

export interface ITradeDocumentTerms {
  incotermId?: Types.ObjectId | null;
  incotermCode?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
}

export interface ITradeDocument extends Document {
  type: TradeDocumentType;
  status: TradeDocumentStatus;
  documentNumber: string;
  fileUrl?: string | null;
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
}

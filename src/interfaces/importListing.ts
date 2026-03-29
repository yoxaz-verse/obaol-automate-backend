import { Document, Types } from "mongoose";

export type ImportListingStatus = "OPEN" | "PARTIAL" | "FULL" | "CLOSED";
export type ImportFlowStatus =
  | "DRAFT"
  | "LISTED"
  | "RESERVED"
  | "APPROVED"
  | "LOCKED"
  | "ENQUIRY_CREATED";

export interface IImportListing extends Document {
  importerCompanyId: Types.ObjectId;
  importerAssociateId: Types.ObjectId;
  commodityName: string;
  productId?: Types.ObjectId | null;
  productVariant?: Types.ObjectId | null;
  totalQuantity: number;
  availableQuantity: number;
  quantityUnit: "MT" | "KG";
  price: number;
  priceUnit: "MT" | "KG";
  adminCommission?: number;
  expectedArrivalDate?: Date | null;
  arrivalWindowDays?: number | null;
  portId?: Types.ObjectId | null;
  portName?: string | null;
  country?: string | null;
  status: ImportListingStatus;
  importStatus?: ImportFlowStatus;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

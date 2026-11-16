import { Document, Types } from "mongoose";

export const REQUIREMENT_ITEM_TYPES = [
  "PROCUREMENT",
  "QUALITY_TESTING",
  "PACKAGING",
  "WAREHOUSE",
  "TRANSPORTATION",
  "FREIGHT_FORWARDING",
] as const;

export type RequirementItemType = (typeof REQUIREMENT_ITEM_TYPES)[number];
export type RequirementStatus = "DRAFT" | "PUBLISHED" | "SOURCING" | "PARTIALLY_AWARDED" | "AWARDED" | "IN_EXECUTION" | "COMPLETED" | "CANCELLED";

export interface IRequirement extends Document {
  reference: string;
  mode: "TRADE" | "SERVICE_ONLY";
  title: string;
  description?: string;
  status: RequirementStatus;
  visibility: "MATCHED" | "INVITE_ONLY" | "PRIVATE";
  createdBy: Types.ObjectId;
  ownerCompanyId?: Types.ObjectId | null;
  product?: { name?: string; variant?: string; quantity?: number; unit?: string };
  route?: Record<string, unknown>;
  targetDate?: Date | null;
  attachments?: Array<{ name: string; url: string }>;
  items: Array<{
    _id: Types.ObjectId;
    type: RequirementItemType;
    title: string;
    specifications?: Record<string, unknown>;
    fulfilmentMethod: "MATCHED_BIDDING" | "INVITE_ONLY" | "DIRECT_ASSIGN";
    status: "DRAFT" | "OPEN" | "AWARDED" | "IN_EXECUTION" | "COMPLETED" | "CANCELLED";
    invitedCompanyIds?: Types.ObjectId[];
    candidateCompanyIds?: Types.ObjectId[];
    bids?: Array<{ companyId: Types.ObjectId; amount?: number; currency?: string; note?: string; status: string; createdBy: Types.ObjectId; createdAt: Date; updatedAt: Date }>;
    awardedCompanyId?: Types.ObjectId | null;
    awardedAt?: Date | null;
    linkedEntityType?: string | null;
    linkedEntityId?: Types.ObjectId | null;
  }>;
  activity?: Array<{ action: string; actorId: Types.ObjectId; at: Date; metadata?: Record<string, unknown> }>;
  legacy?: { type?: "EXTERNAL_ORDER" | "ENQUIRY"; id?: Types.ObjectId } | null;
}

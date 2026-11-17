import { Document, Types } from "mongoose";

export const REQUIREMENT_ITEM_TYPES = [
  "PROCUREMENT",
  "QUALITY_TESTING",
  "PACKAGING",
  "WAREHOUSE",
  "TRANSPORTATION",
  "FREIGHT_FORWARDING",
  "CUSTOM_SERVICE",
] as const;

export type RequirementItemType = (typeof REQUIREMENT_ITEM_TYPES)[number];
export type RequirementStatus = "DRAFT" | "PUBLISHED" | "SOURCING" | "PARTIALLY_AWARDED" | "AWARDED" | "IN_EXECUTION" | "COMPLETED" | "CANCELLED";

export interface IRequirement extends Document {
  reference: string;
  mode: "TRADE" | "SERVICE_ONLY";
  journeyType?: "BUY_PRODUCT" | "HIRE_SERVICE" | "TRACK_EXISTING";
  serviceCategory?: string;
  customServiceName?: string;
  title: string;
  description?: string;
  status: RequirementStatus;
  visibility: "MATCHED" | "INVITE_ONLY" | "PRIVATE";
  identityVisibility?: "IMMEDIATE" | "AFTER_AWARD" | "PRIVATE";
  fulfilmentStrategy?: "MATCHED_BIDDING" | "INVITE_ONLY" | "DIRECT_ASSIGN" | "TRACK_ONLY";
  budget?: { amount?: number | null; currency?: string; flexible?: boolean };
  urgency?: "FLEXIBLE" | "STANDARD" | "URGENT";
  parties?: Record<string, unknown>;
  trackingPlan?: { planKey?: string; label?: string; feeAmount?: number | null; currency?: string; acceptedAt?: Date | null; activationStatus?: "NOT_REQUIRED" | "PENDING" | "ACTIVE" | "REJECTED" };
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
    preferredProviderCompanyId?: Types.ObjectId | null;
    preferredVehicleId?: Types.ObjectId | null;
    bids?: Array<{ companyId: Types.ObjectId; amount?: number; currency?: string; note?: string; status: string; createdBy: Types.ObjectId; createdAt: Date; updatedAt: Date }>;
    awardedCompanyId?: Types.ObjectId | null;
    awardedAt?: Date | null;
    linkedEntityType?: string | null;
    linkedEntityId?: Types.ObjectId | null;
  }>;
  activity?: Array<{ action: string; actorId: Types.ObjectId; at: Date; metadata?: Record<string, unknown> }>;
  stages?: Array<{ key: string; label: string; description?: string; sortOrder: number; ownerRole?: string; expectedAt?: Date | null; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "SKIPPED"; evidenceUrls?: string[]; notes?: string; completedAt?: Date | null; updatedBy?: Types.ObjectId | null }>;
  conversation?: Array<{ authorId: Types.ObjectId; authorRole?: string; body: string; attachmentUrls?: string[]; visibility?: "ALL_PARTICIPANTS" | "REQUESTER_INTERNAL"; createdAt: Date }>;
  legacy?: { type?: "EXTERNAL_ORDER" | "ENQUIRY"; id?: Types.ObjectId } | null;
}

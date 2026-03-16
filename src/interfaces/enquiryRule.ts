import { Document } from "mongoose";

export type EnquiryRuleAction = "SUPPLIER_ACCEPTED" | "BUYER_CONFIRMED" | "RESPONSIBILITIES_FINALIZED";

export interface IEnquiryRule extends Document {
  stageKey: string;
  label: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  requiredActions: EnquiryRuleAction[];
  triggersOrderCreation: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

import { Document } from "mongoose";

export type EnquiryRuleAction =
  | "SUPPLIER_ACCEPTED"
  | "BUYER_CONFIRMED"
  | "CLARIFICATION_REQUESTED"
  | "LOI_SUBMITTED"
  | "SUPPLIER_QTY_CONFIRMED"
  | "REVISION_REQUESTED"
  | "REVISION_CONFIRMED"
  | "QUOTATION_CREATED"
  | "QUOTATION_ACCEPTED"
  | "RETURN_TO_REVISION"
  | "RESPONSIBILITIES_FINALIZED"
  | "PROFORMA_CREATED"
  | "OTHER_DOCS_UPLOADED"
  | "OTHER_DOCS_SKIPPED"
  | "PO_UPLOADED"
  | "PO_SKIPPED"
  | "REVISION_SKIPPED"
  | "CONVERT_TO_ORDER";

export type EnquiryRuleActionBy = "BUYER" | "SUPPLIER" | "BOTH" | "EITHER";

export interface IEnquiryRule extends Document {
  stageKey: string;
  label: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  requiredActions: EnquiryRuleAction[];
  requiredActionMode?: "ALL" | "ANY";
  actionBy?: EnquiryRuleActionBy;
  triggersOrderCreation: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

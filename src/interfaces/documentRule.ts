import { Document } from "mongoose";

export type DocumentRuleStageType =
  | "INQUIRY"
  | "ORDER"
  | "PROCUREMENT"
  | "INLAND_TRANSPORTATION"
  | "PACKAGING"
  | "FREIGHT_FORWARDING"
  | "INVENTORY"
  | "CERTIFICATION"
  | "QUALITY_QA"
  | "WAREHOUSE";
export type DocumentRuleRole = "BUYER" | "SELLER" | "OBAOL" | "PACKAGING" | "QUALITY" | "TRANSPORT" | "SHIPPING";
export type DocumentRuleAction = "CREATE" | "UPLOAD";
export type DocumentRuleVisibility = "BUYER" | "SELLER" | "BOTH" | "INTERNAL";
export type DocumentRuleTradeType = "DOMESTIC" | "INTERNATIONAL" | "BOTH";

export interface IDocumentRule extends Document {
  docType: string;
  stageType: DocumentRuleStageType;
  stageKey: string;
  responsibleRole: DocumentRuleRole;
  actionType: DocumentRuleAction;
  visibility: DocumentRuleVisibility;
  tradeType: DocumentRuleTradeType;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateDocumentRule {
  docType: string;
  stageType: DocumentRuleStageType;
  stageKey: string;
  responsibleRole: DocumentRuleRole;
  actionType: DocumentRuleAction;
  visibility: DocumentRuleVisibility;
  tradeType: DocumentRuleTradeType;
  isRequired?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface IUpdateDocumentRule {
  docType?: string;
  stageType?: DocumentRuleStageType;
  stageKey?: string;
  responsibleRole?: DocumentRuleRole;
  actionType?: DocumentRuleAction;
  visibility?: DocumentRuleVisibility;
  tradeType?: DocumentRuleTradeType;
  isRequired?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  isDeleted?: boolean;
}

import { Document } from "mongoose";

export type FlowType =
  | "TRADE_ENQUIRY"
  | "TRADE_ORDER"
  | "SAMPLING"
  | "WAREHOUSE"
  | "PROCUREMENT"
  | "INLAND_TRANSPORTATION"
  | "PACKAGING"
  | "FREIGHT_FORWARDING"
  | "INVENTORY"
  | "CERTIFICATION"
  | "QUALITY_QA"
  | "WAREHOUSE";

export interface IFlowRule extends Document {
  flowType: FlowType;
  stageKey: string;
  label: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  requiredActions?: string[];
  requiredActionMode?: "ALL" | "ANY";
  actionBy?: "BUYER" | "SUPPLIER" | "BOTH" | "EITHER";
  triggersOrderCreation?: boolean;
  triggersClose?: boolean;
  tradeType?: "DOMESTIC" | "INTERNATIONAL" | "BOTH";
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

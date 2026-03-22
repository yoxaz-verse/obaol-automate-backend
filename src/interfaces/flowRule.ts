import { Document } from "mongoose";

export type FlowType =
  | "TRADE_ENQUIRY"
  | "TRADE_ORDER"
  | "SAMPLING"
  | "WAREHOUSE"
  | "PROCUREMENT"
  | "LOGISTICS"
  | "INTERNAL_LOGISTICS"
  | "PACKAGING"
  | "FREIGHT_FORWARDING"
  | "INVENTORY";

export interface IFlowRule extends Document {
  flowType: FlowType;
  stageKey: string;
  label: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  requiredActions?: string[];
  triggersOrderCreation?: boolean;
  triggersClose?: boolean;
  tradeType?: "DOMESTIC" | "INTERNATIONAL" | "BOTH";
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

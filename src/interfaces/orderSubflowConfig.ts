import { Document } from "mongoose";

export type OrderSubflowType =
  | "PROCUREMENT"
  | "LOGISTICS"
  | "INTERNAL_LOGISTICS"
  | "PACKAGING"
  | "FREIGHT_FORWARDING"
  | "INVENTORY";

export interface IOrderSubflowConfig extends Document {
  orderFlowType: "TRADE_ORDER";
  subflowType: OrderSubflowType;
  startAtOrderStage: string;
  mustCompleteBeforeOrderStage: string;
  dependsOnSubflows: OrderSubflowType[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateOrderSubflowConfig {
  subflowType: OrderSubflowType;
  startAtOrderStage: string;
  mustCompleteBeforeOrderStage: string;
  dependsOnSubflows?: OrderSubflowType[];
  isActive?: boolean;
}

export interface IUpdateOrderSubflowConfig {
  startAtOrderStage?: string;
  mustCompleteBeforeOrderStage?: string;
  dependsOnSubflows?: OrderSubflowType[];
  isActive?: boolean;
  isDeleted?: boolean;
}

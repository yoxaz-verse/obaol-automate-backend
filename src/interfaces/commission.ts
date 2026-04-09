import { Document, Types } from "mongoose";

export type CommissionType = "closer" | "portfolio" | "leadership" | "procurement" | "handler";

export interface ICommission extends Document {
  dealId: Types.ObjectId;
  operatorId: Types.ObjectId;
  type: CommissionType;
  level?: number | null;
  percent: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

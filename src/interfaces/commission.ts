import { Document, Types } from "mongoose";

export type CommissionType = "closer" | "portfolio" | "leadership";

export interface ICommission extends Document {
  dealId: Types.ObjectId;
  employeeId: Types.ObjectId;
  type: CommissionType;
  level?: number | null;
  percent: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}


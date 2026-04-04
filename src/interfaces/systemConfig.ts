import { Document, Types } from "mongoose";

export interface ISystemConfig extends Document {
  key: string;
  value: string;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}


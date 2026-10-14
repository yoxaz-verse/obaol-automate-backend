import { Document, Types } from "mongoose";

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  inventoryManager?: Types.ObjectId;
  approvalStatus?: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  createdAt?: Date;
}

export interface ICreateCategory {
  name: string;
  description?: string;
  inventoryManager?: Types.ObjectId;
}

export interface IUpdateCategory {
  name?: string;
  description?: string;
  inventoryManager?: Types.ObjectId;
}

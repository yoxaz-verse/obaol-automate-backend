import { Document, Types } from "mongoose";

export interface ISubCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  category: Types.ObjectId;
  isDeleted?: boolean;
  createdAt?: Date;
  approvalStatus?: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
}

export interface ICreateSubCategory {
  name: string;
  description?: string;
  category: Types.ObjectId;
}

export interface IUpdateSubCategory {
  name?: string;
  description?: string;
  category?: Types.ObjectId;
}

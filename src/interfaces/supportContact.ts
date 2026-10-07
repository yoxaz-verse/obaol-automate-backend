import { Document } from "mongoose";

export interface ISupportContact extends Document {
  label: string;
  phoneNumber: string;
  displayPhoneNumber: string;
  phoneCountryCode: string;
  phoneNational: string;
  isActive: boolean;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

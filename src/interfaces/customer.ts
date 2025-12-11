import { Types } from "mongoose";

export interface ICustomer {
  _id: Types.ObjectId;
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name: string;
  password: string;
  role: string;
}

export interface ICreateCustomer {
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name: string;
  password: string;
}

export interface IUpdateCustomer {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name?: string;
  password?: string;
}

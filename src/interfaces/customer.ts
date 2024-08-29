export interface ICustomer {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
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

export interface IAdmin {
  _id: string;
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  role: string;
}

export interface ICreateAdmin {
  name: string;
  email: string;
  password: string;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  // Add any additional fields if necessary
}

export interface IUpdateAdmin {
  name?: string;
  email?: string;
  password?: string;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  refreshToken?: string;
  // Add any additional fields if necessary
}

export interface IAdmin {
  [x: string]: any;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isSuperAdmin: boolean;
  name: string;
  password: string;
  refreshToken?: string;
}

export interface ICreateAdmin {
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isSuperAdmin?: boolean;
  name: string;
  password: string;
}

export interface IUpdateAdmin {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isSuperAdmin?: boolean;
  name?: string;
  password?: string;
  refreshToken?: string;
}

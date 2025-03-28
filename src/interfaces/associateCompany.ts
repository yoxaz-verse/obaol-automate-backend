export interface IAssociateCompany {
  _id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  phoneSecondary: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface ICreateAssociateCompany {
  name: string;
  email: string;
  phone: string;
  location: string;
  phoneSecondary: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface IUpdateAssociateCompany {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  phoneSecondary?: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

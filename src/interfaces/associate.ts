export interface IAssociate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  associateCompany: string; // Assuming this is stored as the ID of the AssociateCompany
  password: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface ICreateAssociate {
  name: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  associateCompany: string; // ID of the AssociateCompany
  password: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface IUpdateAssociate {
  name?: string;
  email?: string;
  phone?: string;
  phoneSecondary?: string;
  associateCompany?: string; // ID of the AssociateCompany
  password?: string;
  isActive?: boolean;
  isDeleted?: boolean;
}
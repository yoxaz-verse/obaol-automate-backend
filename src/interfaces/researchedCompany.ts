export interface IAssociateCompany {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyBusinessModel: string;
  companyIntent: string;
  companyStage: string;
  companyType: string;
  state: string;
  district: string;
  division: string;
  pinCode: string;
  product: string;
  certification: string;
  phoneSecondary: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface ICreateAssociateCompany {
  name: string;
  email: string;
  phone: string;
  companyBusinessModel: string;
  companyIntent: string;
  companyStage: string;
  companyType: string;
  state: string;
  district: string;
  division: string;
  pinCode: string;
  product: string;
  certification: string;
  phoneSecondary: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface IUpdateAssociateCompany {
  name?: string;
  email?: string;
  phone?: string;
  companyBusinessModel: string;
  companyIntent: string;
  companyStage: string;
  companyType: string;
  state: string;
  district: string;
  division: string;
  pinCode: string;
  product: string;
  certification: string;
  phoneSecondary?: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

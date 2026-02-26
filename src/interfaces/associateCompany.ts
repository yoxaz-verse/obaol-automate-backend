export interface IAssociateCompany {
  _id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  phoneSecondary: string;
  isActive?: boolean;
  isDeleted?: boolean;
  supervisor?: string;
  logo?: string;
  banner?: string;
  description?: string;
  aboutUs?: string;
  address?: string;
  website?: string;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  tags?: string[];
  subdomain?: string;
  customDomain?: string;
  isWebsiteLive?: boolean;
}

export interface ICreateAssociateCompany {
  name: string;
  email: string;
  phone: string;
  location: string;
  phoneSecondary: string;
  isActive?: boolean;
  isDeleted?: boolean;
  supervisor?: string;
  logo?: string;
  banner?: string;
  description?: string;
  aboutUs?: string;
  address?: string;
  website?: string;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  tags?: string[];
  subdomain?: string;
  customDomain?: string;
  isWebsiteLive?: boolean;
}

export interface IUpdateAssociateCompany {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  phoneSecondary?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  supervisor?: string;
  logo?: string;
  banner?: string;
  description?: string;
  aboutUs?: string;
  address?: string;
  website?: string;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  tags?: string[];
  subdomain?: string;
  customDomain?: string;
  isWebsiteLive?: boolean;
}

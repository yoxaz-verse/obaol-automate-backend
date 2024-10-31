export interface IServiceCompany {
  name: string;
  address: string;
  description?: string;
  map?: string;
  url?: string;
  isActive: boolean;
  isDeleted: boolean;
}

export interface ICreateServiceCompany {
  name: string;
  address: string;
  description?: string;
  map?: string;
  url?: string;
}

export interface IUpdateServiceCompany {
  name?: string;
  address?: string;
  description?: string;
  map?: string;
  url?: string;
}


export interface IActivityStatus {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  // Add any additional fields if necessary
}

export interface ICreateActivityStatus {
  name: string;
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

export interface IUpdateActivityStatus {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

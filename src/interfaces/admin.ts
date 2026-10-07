export interface IAdmin {
  _id: string;
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  refreshToken?: string;
  failedLoginAttempts?: number;
  loginLockedUntil?: Date | null;
  lastFailedLoginAt?: Date | null;
  loginLockoutLevel?: number;
  lastSeenAt?: Date | null;
  lastLoginAt?: Date | null;
  presenceUpdatedAt?: Date | null;
  presenceSource?: "AUTH_REQUEST" | "HEARTBEAT" | null;
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
  failedLoginAttempts?: number;
  loginLockedUntil?: Date | null;
  lastFailedLoginAt?: Date | null;
  loginLockoutLevel?: number;
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
  failedLoginAttempts?: number;
  loginLockedUntil?: Date | null;
  lastFailedLoginAt?: Date | null;
  loginLockoutLevel?: number;
  // Add any additional fields if necessary
}

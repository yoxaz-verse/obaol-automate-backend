// src/types/userTypes.ts

export interface IUser {
  id: string;
  email: string;
  role: UserRole;
}

export type UserRole =
  | "Admin"
  | "Operator"
  | "Associate"
  | "CustomerSupport"
  | "warehouse_operator"
  | "ActivityManager"
  | "Worker"
  | "User"
  | "ProjectManager";

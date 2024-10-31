// src/types/userTypes.ts

export interface IUser {
    id: string;
    email: string;
    role: UserRole;
  }
  
  export type UserRole = 'Admin' | 'Manager' | 'Worker' | 'User';
  
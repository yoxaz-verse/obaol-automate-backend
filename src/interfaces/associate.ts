import { Types } from "mongoose";

export interface IAssociate {
  _id: string;
  name: string;
  email: string;
  designation?: Types.ObjectId | string | null;
  phone: string;
  phoneCountryCode?: string;
  phoneNational?: string;
  phoneSecondary: string;
  phoneSecondaryCountryCode?: string;
  phoneSecondaryNational?: string;
  associateInterests?: string[];
  associateCompany: string; // Assuming this is stored as the ID of the AssociateCompany
  hasCompany?: boolean;
  companyMode?: "existing" | "new" | "none";
  password: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isOneToOneVerified?: boolean;
  isCompanyVerified?: boolean;
  registrationStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  onboardingContactPreference?: "phone" | "email";
  onboardingContactNotes?: string;
  registrationSource?: string;
}

export interface ICreateAssociate {
  name: string;
  email: string;
  phone: string;
  phoneCountryCode?: string;
  phoneNational?: string;
  phoneSecondary: string;
  phoneSecondaryCountryCode?: string;
  phoneSecondaryNational?: string;
  associateInterests?: string[];
  associateCompany: string; // ID of the AssociateCompany
  designation?: Types.ObjectId | string | null;
  hasCompany?: boolean;
  companyMode?: "existing" | "new" | "none";
  password: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isOneToOneVerified?: boolean;
  isCompanyVerified?: boolean;
  registrationStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  onboardingContactPreference?: "phone" | "email";
  onboardingContactNotes?: string;
  registrationSource?: string;
}

export interface IUpdateAssociate {
  name?: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneNational?: string;
  phoneSecondary?: string;
  phoneSecondaryCountryCode?: string;
  phoneSecondaryNational?: string;
  associateInterests?: string[];
  designation?: Types.ObjectId | string | null;
  associateCompany?: string; // ID of the AssociateCompany
  hasCompany?: boolean;
  companyMode?: "existing" | "new" | "none";
  password?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isOneToOneVerified?: boolean;
  isCompanyVerified?: boolean;
  registrationStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  onboardingContactPreference?: "phone" | "email";
  onboardingContactNotes?: string;
  registrationSource?: string;
}

import { Document, Schema } from "mongoose";

export interface IWarehouse extends Document {
    name: string;
    contactPhone: string;
    contactPhoneCountryCode?: string;
    contactPhoneNational?: string;
    contactPhoneSecondary?: string;
    contactPhoneSecondaryCountryCode?: string;
    contactPhoneSecondaryNational?: string;
    address?: string;
    location?: {
        latitude?: number;
        longitude?: number;
        label?: string;
        district?: string;
        pincode?: string;
        city?: string;
        state?: string;
        country?: string;
    } | null;
    totalCapacity?: number;
    ownerCompanyId?: Schema.Types.ObjectId | null;
    ownerAssociateId?: Schema.Types.ObjectId | null;
    listingType: "PRIVATE" | "RENTAL";
    isRentalActive: boolean;
    category: "GENERAL" | "COLD_STORAGE" | "BONDED" | "AGRO";
    allowedCategoryIds?: Schema.Types.ObjectId[];
    storageRatePerUnit: number;
    unit: "KG" | "MT";
    isActive: boolean;
    listingState?: "DRAFT" | "LIVE";
    activatedAt?: Date | null;
    activatedBy?: Schema.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

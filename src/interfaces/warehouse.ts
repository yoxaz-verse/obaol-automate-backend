import { Document, Schema } from "mongoose";

export interface IWarehouse extends Document {
    name: string;
    address?: string;
    ownerCompanyId?: Schema.Types.ObjectId | null;
    ownerAssociateId?: Schema.Types.ObjectId | null;
    listingType: "PRIVATE" | "RENTAL";
    isRentalActive: boolean;
    category: "GENERAL" | "COLD_STORAGE" | "BONDED" | "AGRO";
    allowedCategoryIds?: Schema.Types.ObjectId[];
    storageRatePerUnit: number;
    unit: "KG" | "MT";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

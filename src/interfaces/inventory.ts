import { Document, Schema } from "mongoose";

export interface IInventory extends Document {
    product: Schema.Types.ObjectId;
    productVariant: Schema.Types.ObjectId;
    associate: Schema.Types.ObjectId;
    associateCompany?: Schema.Types.ObjectId;
    quantity: number;
    unit: string;
    warehouseName?: string;
    state?: Schema.Types.ObjectId;
    district?: Schema.Types.ObjectId;
    division?: Schema.Types.ObjectId;
    pincodeEntry?: Schema.Types.ObjectId;
    linkedVariantRate?: Schema.Types.ObjectId | null;
    isDemo?: boolean;
    demoTag?: string;
    demoCreatedBy?: Schema.Types.ObjectId | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

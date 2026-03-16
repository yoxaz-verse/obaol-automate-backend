import { Document, Schema } from "mongoose";

export type InventoryReservationStatus = "RESERVED" | "RELEASED" | "CONSUMED";

export interface IInventoryReservation extends Document {
    inventoryId: Schema.Types.ObjectId;
    orderId?: Schema.Types.ObjectId | null;
    enquiryId: Schema.Types.ObjectId;
    productVariant: Schema.Types.ObjectId;
    associateCompany: Schema.Types.ObjectId;
    quantity: number;
    status: InventoryReservationStatus;
    reservedAt: Date;
    releasedAt?: Date | null;
    consumedAt?: Date | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

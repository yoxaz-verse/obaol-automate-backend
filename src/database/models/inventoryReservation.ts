import mongoose, { Schema } from "mongoose";
import { IInventoryReservation } from "../../interfaces/inventoryReservation";

const InventoryReservationSchema: Schema = new Schema(
    {
        inventoryId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true, index: true },
        orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
        enquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", required: true },
        productVariant: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true, index: true },
        associateCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
        quantity: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ["RESERVED", "RELEASED", "CONSUMED"],
            default: "RESERVED",
            index: true,
        },
        reservedAt: { type: Date, default: Date.now, index: true },
        releasedAt: { type: Date, default: null },
        consumedAt: { type: Date, default: null },
        isDeleted: { type: Boolean, default: false, index: true },
        idempotencyKey: { type: String, default: null, trim: true, maxlength: 200, select: false },
        idempotencyPayloadHash: { type: String, default: null, select: false },
    },
    { timestamps: true }
);

InventoryReservationSchema.index({ enquiryId: 1, status: 1 });
InventoryReservationSchema.index({ orderId: 1, status: 1 });
InventoryReservationSchema.index({ inventoryId: 1, status: 1 });
InventoryReservationSchema.index({ associateCompany: 1, createdAt: -1 });
InventoryReservationSchema.index(
    { enquiryId: 1 },
    { unique: true, partialFilterExpression: { status: "RESERVED" } }
);
InventoryReservationSchema.index(
    { enquiryId: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

export const InventoryReservationModel = mongoose.model<IInventoryReservation>(
    "InventoryReservation",
    InventoryReservationSchema
);

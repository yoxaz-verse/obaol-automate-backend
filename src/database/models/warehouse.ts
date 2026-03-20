import mongoose, { Schema } from "mongoose";
import { IWarehouse } from "../../interfaces/warehouse";

const WarehouseSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        address: { type: String, default: "" },
        ownerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
        ownerAssociateId: { type: Schema.Types.ObjectId, ref: "Associate", default: null, index: true },
        listingType: { type: String, enum: ["PRIVATE", "RENTAL"], default: "PRIVATE", index: true },
        isRentalActive: { type: Boolean, default: false, index: true },
        category: {
            type: String,
            enum: ["GENERAL", "COLD_STORAGE", "BONDED", "AGRO"],
            default: "GENERAL",
            index: true,
        },
        allowedCategoryIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "Category",
            },
        ],
        storageRatePerUnit: { type: Number, required: true, default: 0, min: 0 },
        unit: { type: String, enum: ["KG", "MT"], default: "MT" },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

export const WarehouseModel = mongoose.model<IWarehouse>(
    "Warehouse",
    WarehouseSchema
);

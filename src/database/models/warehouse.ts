import mongoose, { Schema } from "mongoose";
import { IWarehouse } from "../../interfaces/warehouse";
import { normalizePhoneInput } from "../../utils/phone";

const WarehouseSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        contactPhone: { type: String, required: true },
        contactPhoneCountryCode: { type: String, default: "+91" },
        contactPhoneNational: { type: String, default: "" },
        contactPhoneSecondary: { type: String, default: "" },
        contactPhoneSecondaryCountryCode: { type: String, default: "+91" },
        contactPhoneSecondaryNational: { type: String, default: "" },
        address: { type: String, default: "" },
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            label: { type: String, default: "" },
            district: { type: String, default: "" },
            pincode: { type: String, default: "" },
            city: { type: String, default: "" },
            state: { type: String, default: "" },
            country: { type: String, default: "" },
        },
        totalCapacity: { type: Number, default: 0, min: 0 },
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

WarehouseSchema.pre("save", function (next) {
    const normalizedPrimary = normalizePhoneInput({
        rawPhone: (this as any).contactPhone,
        rawCountryCode: (this as any).contactPhoneCountryCode,
        rawNational: (this as any).contactPhoneNational,
    });
    (this as any).contactPhone = normalizedPrimary.e164;
    (this as any).contactPhoneCountryCode = normalizedPrimary.countryCode;
    (this as any).contactPhoneNational = normalizedPrimary.national;

    const secondaryRaw = String((this as any).contactPhoneSecondary || "").trim();
    if (secondaryRaw) {
        const normalizedSecondary = normalizePhoneInput({
            rawPhone: secondaryRaw,
            rawCountryCode:
                (this as any).contactPhoneSecondaryCountryCode || (this as any).contactPhoneCountryCode,
            rawNational: (this as any).contactPhoneSecondaryNational,
            fallbackCountryCode: (this as any).contactPhoneCountryCode,
        });
        (this as any).contactPhoneSecondary = normalizedSecondary.e164;
        (this as any).contactPhoneSecondaryCountryCode = normalizedSecondary.countryCode;
        (this as any).contactPhoneSecondaryNational = normalizedSecondary.national;
    }

    next();
});

WarehouseSchema.pre("findOneAndUpdate", function (next) {
    const update: any = this.getUpdate() || {};
    const payload = update.$set ? update.$set : update;
    const hasPrimaryPhone =
        Object.prototype.hasOwnProperty.call(payload, "contactPhone") ||
        Object.prototype.hasOwnProperty.call(payload, "contactPhoneCountryCode") ||
        Object.prototype.hasOwnProperty.call(payload, "contactPhoneNational");
    const hasSecondaryPhone =
        Object.prototype.hasOwnProperty.call(payload, "contactPhoneSecondary") ||
        Object.prototype.hasOwnProperty.call(payload, "contactPhoneSecondaryCountryCode") ||
        Object.prototype.hasOwnProperty.call(payload, "contactPhoneSecondaryNational");

    if (hasPrimaryPhone) {
        const normalizedPrimary = normalizePhoneInput({
            rawPhone: payload.contactPhone,
            rawCountryCode: payload.contactPhoneCountryCode,
            rawNational: payload.contactPhoneNational,
        });
        payload.contactPhone = normalizedPrimary.e164;
        payload.contactPhoneCountryCode = normalizedPrimary.countryCode;
        payload.contactPhoneNational = normalizedPrimary.national;
    }

    if (hasSecondaryPhone && String(payload.contactPhoneSecondary || "").trim()) {
        const normalizedSecondary = normalizePhoneInput({
            rawPhone: payload.contactPhoneSecondary,
            rawCountryCode: payload.contactPhoneSecondaryCountryCode || payload.contactPhoneCountryCode,
            rawNational: payload.contactPhoneSecondaryNational,
            fallbackCountryCode: payload.contactPhoneCountryCode || "+91",
        });
        payload.contactPhoneSecondary = normalizedSecondary.e164;
        payload.contactPhoneSecondaryCountryCode = normalizedSecondary.countryCode;
        payload.contactPhoneSecondaryNational = normalizedSecondary.national;
    }

    if (update.$set) {
        update.$set = payload;
        this.setUpdate(update);
    } else {
        this.setUpdate(payload);
    }
    next();
});

export const WarehouseModel = mongoose.model<IWarehouse>(
    "Warehouse",
    WarehouseSchema
);

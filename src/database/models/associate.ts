import mongoose from "mongoose";
import { passwordPlugin } from "./plugins/password.plugin";
import { IAssociate } from "../../interfaces/associate";
import { normalizePhoneInput } from "../../utils/phone";
import { ASSOCIATE_INTERESTS } from "../../constants/companyInterests";

export interface IAssociateDocument extends IAssociate, mongoose.Document {
    _id: any;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const associateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        designation: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },
        phone: { type: String, required: true },
        phoneCountryCode: { type: String, default: "+91" },
        phoneNational: { type: String, default: "" },
        phoneSecondary: { type: String },
        phoneSecondaryCountryCode: { type: String, default: "+91" },
        phoneSecondaryNational: { type: String, default: "" },
        associateInterests: [{ type: String, enum: ASSOCIATE_INTERESTS, default: [] }],
        tradeMode: { type: String, enum: ["BUY", "SELL", "BOTH", "SERVICE"], default: "BOTH", index: true },
        associateCompany: { type: mongoose.Schema.Types.ObjectId, ref: "AssociateCompany" },
        hasCompany: { type: Boolean, default: false },
        companyMode: { type: String, enum: ["existing", "new", "none"], default: "none" },
        address: { type: String },
        geoType: { type: String, enum: ["INDIAN", "INTERNATIONAL"], default: "INDIAN" },
        country: { type: mongoose.Types.ObjectId, ref: "Country", required: false },
        state: { type: mongoose.Types.ObjectId, ref: "State" },
        district: { type: mongoose.Types.ObjectId, ref: "District" },
        division: { type: mongoose.Types.ObjectId, ref: "Division", required: false },
        pincodeEntry: { type: mongoose.Types.ObjectId, ref: "PincodeEntry", required: false },
        password: { type: String, required: true },
        authProvider: { type: String, enum: ["LOCAL", "GOOGLE"], default: "LOCAL" },
        googleSub: { type: String, default: null },
        googleEmailVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        isOneToOneVerified: { type: Boolean, default: false },
        isCompanyVerified: { type: Boolean, default: false },
        registrationStatus: {
            type: String,
            enum: ["PENDING_REVIEW", "APPROVED", "REJECTED"],
            default: "PENDING_REVIEW",
        },
        approvalRequestedAt: { type: Date, default: null },
        reviewNotes: { type: String, default: "" },
        onboardingContactPreference: {
            type: String,
            enum: ["phone", "email"],
            default: "phone",
        },
        onboardingContactNotes: { type: String, default: "" },
        registrationSource: { type: String, default: "SELF_REGISTERED" },
        onboardingComplete: { type: Boolean, default: false },
        dashboardTutorialStatus: {
            type: String,
            enum: ["PENDING", "SKIPPED", "COMPLETED"],
            default: "PENDING",
        },
        dashboardTutorialUpdatedAt: { type: Date, default: null },
        lastSeenAt: { type: Date, default: null, index: true },
        presenceUpdatedAt: { type: Date, default: null },
        presenceSource: { type: String, enum: ["AUTH_REQUEST", "HEARTBEAT", null], default: null },
        failedLoginAttempts: { type: Number, default: 0 },
        loginLockedUntil: { type: Date, default: null },
        lastFailedLoginAt: { type: Date, default: null },
        loginLockoutLevel: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

associateSchema.index({ registrationStatus: 1, onboardingComplete: 1, isDeleted: 1, createdAt: -1 });

associateSchema.pre("save", function (next) {
    const normalizedPrimary = normalizePhoneInput({
        rawPhone: (this as any).phone,
        rawCountryCode: (this as any).phoneCountryCode,
        rawNational: (this as any).phoneNational,
    });

    (this as any).phone = normalizedPrimary.e164;
    (this as any).phoneCountryCode = normalizedPrimary.countryCode;
    (this as any).phoneNational = normalizedPrimary.national;

    const secondaryRaw = (this as any).phoneSecondary || "";
    if (String(secondaryRaw).trim()) {
        const normalizedSecondary = normalizePhoneInput({
            rawPhone: secondaryRaw,
            rawCountryCode: (this as any).phoneSecondaryCountryCode || (this as any).phoneCountryCode,
            rawNational: (this as any).phoneSecondaryNational,
            fallbackCountryCode: (this as any).phoneCountryCode,
        });
        (this as any).phoneSecondary = normalizedSecondary.e164;
        (this as any).phoneSecondaryCountryCode = normalizedSecondary.countryCode;
        (this as any).phoneSecondaryNational = normalizedSecondary.national;
    }

    next();
});

associateSchema.pre("findOneAndUpdate", function (next) {
    const update: any = this.getUpdate() || {};
    const payload = update.$set ? update.$set : update;
    const hasPrimaryPhone =
        Object.prototype.hasOwnProperty.call(payload, "phone") ||
        Object.prototype.hasOwnProperty.call(payload, "phoneCountryCode") ||
        Object.prototype.hasOwnProperty.call(payload, "phoneNational");
    const hasSecondaryPhone =
        Object.prototype.hasOwnProperty.call(payload, "phoneSecondary") ||
        Object.prototype.hasOwnProperty.call(payload, "phoneSecondaryCountryCode") ||
        Object.prototype.hasOwnProperty.call(payload, "phoneSecondaryNational");

    if (hasPrimaryPhone) {
        const normalizedPrimary = normalizePhoneInput({
            rawPhone: payload.phone,
            rawCountryCode: payload.phoneCountryCode,
            rawNational: payload.phoneNational,
        });
        payload.phone = normalizedPrimary.e164;
        payload.phoneCountryCode = normalizedPrimary.countryCode;
        payload.phoneNational = normalizedPrimary.national;
    }

    if (hasSecondaryPhone && String(payload.phoneSecondary || "").trim()) {
        const normalizedSecondary = normalizePhoneInput({
            rawPhone: payload.phoneSecondary,
            rawCountryCode: payload.phoneSecondaryCountryCode || payload.phoneCountryCode,
            rawNational: payload.phoneSecondaryNational,
            fallbackCountryCode: payload.phoneCountryCode || "+91",
        });
        payload.phoneSecondary = normalizedSecondary.e164;
        payload.phoneSecondaryCountryCode = normalizedSecondary.countryCode;
        payload.phoneSecondaryNational = normalizedSecondary.national;
    }

    if (update.$set) {
        update.$set = payload;
        this.setUpdate(update);
    } else {
        this.setUpdate(payload);
    }
    next();
});

associateSchema.plugin(passwordPlugin);

export const AssociateModel = mongoose.model<IAssociateDocument>(
    "Associate",
    associateSchema
);

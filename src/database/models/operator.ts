import mongoose from "mongoose";
import { passwordPlugin } from "./plugins/password.plugin";
import { normalizePhoneInput } from "../../utils/phone";

interface ITime {
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
}

interface IWorkingHour {
    start: ITime;
    end: ITime;
}

export interface IOperator extends mongoose.Document {
    name: string;
    email: string;
    phone: string;
    phoneCountryCode?: string;
    phoneNational?: string;
    password: string;
    authProvider?: "LOCAL" | "GOOGLE";
    googleSub?: string | null;
    googleEmailVerified?: boolean;
    isEmailVerified?: boolean;
    address: string;
    geoType?: "INDIAN" | "INTERNATIONAL";
    country?: mongoose.Types.ObjectId | null;
    district?: mongoose.Types.ObjectId;
    state?: mongoose.Types.ObjectId;
    joiningDate?: Date;
    jobType: mongoose.Types.ObjectId;
    jobRole: mongoose.Types.ObjectId;
    workingHours?: IWorkingHour[];
    languageKnown: mongoose.Types.ObjectId[];
    isActive: boolean;
    isDeleted: boolean;
    registrationStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    registrationSource?: "SELF_REGISTERED" | "ADMIN_CREATED";
    approvedAt?: Date | null;
    approvedBy?: mongoose.Types.ObjectId | null;
    approvalRequestedAt?: Date | null;
    reviewNotes?: string;
    role: string;
    mentorOperator?: mongoose.Types.ObjectId | null;
    lastSeenAt?: Date | null;
    presenceUpdatedAt?: Date | null;
    presenceSource?: "AUTH_REQUEST" | "HEARTBEAT" | null;
    referralCode?: string;
    onboardingComplete?: boolean;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const timeSchema = new mongoose.Schema(
    {
        hour: { type: Number, required: true },
        minute: { type: Number, required: true },
        second: { type: Number, required: true },
        millisecond: { type: Number, required: true },
    },
    { _id: false }
);

const workingHourSchema = new mongoose.Schema(
    {
        start: { type: timeSchema, required: true },
        end: { type: timeSchema, required: true },
    },
    { _id: false }
);

const operatorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        phoneCountryCode: { type: String, default: "+91" },
        phoneNational: { type: String, default: "" },
        password: { type: String, required: true },
        authProvider: { type: String, enum: ["LOCAL", "GOOGLE"], default: "LOCAL" },
        googleSub: { type: String, default: null },
        googleEmailVerified: { type: Boolean, default: false },
        isEmailVerified: { type: Boolean, default: false },
        address: { type: String, required: true },
        geoType: { type: String, enum: ["INDIAN", "INTERNATIONAL"], default: "INDIAN" },
        country: { type: mongoose.Types.ObjectId, ref: "Country", required: false },
        district: { type: mongoose.Types.ObjectId, ref: "District" },
        state: { type: mongoose.Types.ObjectId, ref: "State" },
        joiningDate: { type: Date, default: Date.now },
        jobRole: { type: mongoose.Types.ObjectId, ref: "JobRole" },
        jobType: { type: mongoose.Types.ObjectId, ref: "JobType" },
        workingHours: { type: [workingHourSchema], default: [] },
        languageKnown: [{ type: mongoose.Types.ObjectId, ref: "Language" }],
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        registrationStatus: {
            type: String,
            enum: ["PENDING_REVIEW", "APPROVED", "REJECTED"],
            default: "PENDING_REVIEW",
        },
        registrationSource: { type: String, default: "SELF_REGISTERED" },
        onboardingComplete: { type: Boolean, default: false },
        approvedAt: { type: Date, default: null },
        approvedBy: { type: mongoose.Types.ObjectId, ref: "Admin", default: null },
        approvalRequestedAt: { type: Date, default: null },
        reviewNotes: { type: String, default: "" },
        role: { type: String, default: "operator" },
        mentorOperator: { type: mongoose.Types.ObjectId, ref: "Operator", default: null, index: true },
        lastSeenAt: { type: Date, default: null, index: true },
        presenceUpdatedAt: { type: Date, default: null },
        presenceSource: { type: String, enum: ["AUTH_REQUEST", "HEARTBEAT", null], default: null },
        referralCode: {
            type: String,
            unique: true,
            index: true,
            uppercase: true,
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const REFERRAL_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DEFAULT_REFERRAL_LENGTH = 8;

const generateReferralCode = (length = DEFAULT_REFERRAL_LENGTH) => {
    let code = "";
    for (let i = 0; i < length; i += 1) {
        const idx = Math.floor(Math.random() * REFERRAL_CODE_CHARS.length);
        code += REFERRAL_CODE_CHARS[idx];
    }
    return code;
};

export const generateOperatorReferralCode = async (length = DEFAULT_REFERRAL_LENGTH) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = generateReferralCode(length);
        const exists = await OperatorModel.exists({ referralCode: code });
        if (!exists) return code;
    }
    throw new Error("Unable to generate a unique referral code.");
};

operatorSchema.pre("save", function (next) {
    const normalized = normalizePhoneInput({
        rawPhone: (this as any).phone,
        rawCountryCode: (this as any).phoneCountryCode,
        rawNational: (this as any).phoneNational,
    });
    (this as any).phone = normalized.e164;
    (this as any).phoneCountryCode = normalized.countryCode;
    (this as any).phoneNational = normalized.national;
    next();
});

operatorSchema.pre("save", async function (next) {
    try {
        if ((this as any).referralCode) {
            return next();
        }
        (this as any).referralCode = await generateOperatorReferralCode();
        return next();
    } catch (error) {
        return next(error as any);
    }
});

operatorSchema.pre("findOneAndUpdate", function (next) {
    const update: any = this.getUpdate() || {};
    const payload = update.$set ? update.$set : update;
    const hasPhone =
        Object.prototype.hasOwnProperty.call(payload, "phone") ||
        Object.prototype.hasOwnProperty.call(payload, "phoneCountryCode") ||
        Object.prototype.hasOwnProperty.call(payload, "phoneNational");
    if (hasPhone) {
        const normalized = normalizePhoneInput({
            rawPhone: payload.phone,
            rawCountryCode: payload.phoneCountryCode,
            rawNational: payload.phoneNational,
        });
        payload.phone = normalized.e164;
        payload.phoneCountryCode = normalized.countryCode;
        payload.phoneNational = normalized.national;
    }
    if (update.$set) {
        update.$set = payload;
        this.setUpdate(update);
    } else {
        this.setUpdate(payload);
    }
    next();
});

operatorSchema.plugin(passwordPlugin);

export const OperatorModel = mongoose.model<IOperator>("Operator", operatorSchema, "operators");

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

interface IEmployee extends mongoose.Document {
    name: string;
    email: string;
    phone: string;
    phoneCountryCode?: string;
    phoneNational?: string;
    password: string;
    address: string;
    district?: mongoose.Types.ObjectId;
    state?: mongoose.Types.ObjectId;
    joiningDate: Date;
    jobType: mongoose.Types.ObjectId;
    jobRole: mongoose.Types.ObjectId;
    workingHours: IWorkingHour[];
    languageKnown: mongoose.Types.ObjectId[];
    isActive: boolean;
    isDeleted: boolean;
    role: string;
    lastSeenAt?: Date | null;
    presenceUpdatedAt?: Date | null;
    presenceSource?: "AUTH_REQUEST" | "HEARTBEAT" | null;
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


const employeeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        phoneCountryCode: { type: String, default: "+91" },
        phoneNational: { type: String, default: "" },
        password: { type: String, required: true },
        address: { type: String, required: true },
        district: { type: mongoose.Types.ObjectId, ref: "District" },
        state: { type: mongoose.Types.ObjectId, ref: "State" },
        joiningDate: { type: Date, required: true },
        jobRole: { type: mongoose.Types.ObjectId, ref: "JobRole" },
        jobType: { type: mongoose.Types.ObjectId, ref: "JobType" },

        // ✅ Array of start/end time objects
        workingHours: { type: [workingHourSchema], required: true },

        // ✅ Array of ObjectIds
        languageKnown: [{ type: mongoose.Types.ObjectId, ref: "Language" }],

        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        role: { type: String, default: "team" },
        lastSeenAt: { type: Date, default: null, index: true },
        presenceUpdatedAt: { type: Date, default: null },
        presenceSource: { type: String, enum: ["AUTH_REQUEST", "HEARTBEAT", null], default: null },
    },
    {
        timestamps: true,
    }
);

employeeSchema.pre("save", function (next) {
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

employeeSchema.pre("findOneAndUpdate", function (next) {
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

employeeSchema.plugin(passwordPlugin);

export const EmployeeModel = mongoose.model<IEmployee>(
    "Employee",
    employeeSchema
);

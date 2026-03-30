import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentTerm extends Document {
    label: string;
    advancePercent?: number;
    balancePercent?: number;
    milestone?: string;
    notes?: string;
    applicableIncoterms?: string[];
    milestones?: Array<{
        label: string;
        percent: number;
        triggerType: "DOC" | "STAGE";
        triggerValue: string;
    }>;
    isDefault?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentTermSchema: Schema = new Schema(
    {
        label: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            maxlength: 200
        },
        advancePercent: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        balancePercent: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        milestone: {
            type: String,
            trim: true,
            maxlength: 200,
            default: null
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },
        applicableIncoterms: {
            type: [String],
            default: [],
            set: (value: any) => {
                if (Array.isArray(value)) return value.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
                if (typeof value === "string") {
                    return value
                        .split(",")
                        .map((v) => String(v).trim().toUpperCase())
                        .filter(Boolean);
                }
                return [];
            },
        },
        milestones: {
            type: [
                {
                    label: { type: String, required: true, trim: true },
                    percent: { type: Number, required: true, min: 0, max: 100 },
                    triggerType: { type: String, enum: ["DOC", "STAGE"], required: true },
                    triggerValue: { type: String, required: true, trim: true },
                },
            ],
            default: [],
            set: (value: any) => {
                if (Array.isArray(value)) return value;
                if (typeof value === "string") {
                    try {
                        const parsed = JSON.parse(value);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                }
                return [];
            },
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true
    }
);

export const PaymentTermModel = mongoose.model<IPaymentTerm>("PaymentTerm", PaymentTermSchema);

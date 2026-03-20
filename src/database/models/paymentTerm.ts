import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentTerm extends Document {
    label: string;
    advancePercent?: number;
    balancePercent?: number;
    milestone?: string;
    notes?: string;
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
        }
    },
    {
        timestamps: true
    }
);

export const PaymentTermModel = mongoose.model<IPaymentTerm>("PaymentTerm", PaymentTermSchema);

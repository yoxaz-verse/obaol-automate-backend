import mongoose, { Schema, Document } from "mongoose";

export interface IIncoterm extends Document {
    code: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const IncotermSchema: Schema = new Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            minlength: 2,
            maxlength: 10
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000
        }
    },
    {
        timestamps: true
    }
);

IncotermSchema.index({ code: 1 });

export const IncotermModel = mongoose.model<IIncoterm>("Incoterm", IncotermSchema);


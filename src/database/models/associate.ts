import mongoose from "mongoose";
import { passwordPlugin } from "./plugins/password.plugin";
import { IAssociate } from "../../interfaces/associate";

export interface IAssociateDocument extends IAssociate, mongoose.Document {
    _id: any;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const associateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        designation: { type: String },
        phone: { type: String, required: true },
        phoneSecondary: { type: String },
        associateCompany: { type: mongoose.Schema.Types.ObjectId, ref: "AssociateCompany" },
        password: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        isOneToOneVerified: { type: Boolean, default: false },
        isCompanyVerified: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

associateSchema.plugin(passwordPlugin);

export const AssociateModel = mongoose.model<IAssociateDocument>(
    "Associate",
    associateSchema
);

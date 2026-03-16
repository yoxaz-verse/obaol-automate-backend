import { Document } from "mongoose";

export interface IOrderRule extends Document {
    stageKey: string;
    label: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
    tradeType?: "DOMESTIC" | "INTERNATIONAL" | "BOTH";
    triggersClose?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

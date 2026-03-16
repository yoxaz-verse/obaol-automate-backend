import mongoose, { Schema } from "mongoose";
import { IOrderRule } from "../../interfaces/orderRule";

const OrderRuleSchema: Schema = new Schema(
    {
        stageKey: { type: String, required: true, unique: true, trim: true, uppercase: true },
        label: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        tradeType: { type: String, enum: ["DOMESTIC", "INTERNATIONAL", "BOTH"], default: "BOTH" },
        triggersClose: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);
OrderRuleSchema.index({ sortOrder: 1 });
OrderRuleSchema.index({ isActive: 1 });

export const OrderRuleModel = mongoose.model<IOrderRule>("OrderRule", OrderRuleSchema);

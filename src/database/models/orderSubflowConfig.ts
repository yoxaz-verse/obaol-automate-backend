import mongoose, { Schema } from "mongoose";
import { IOrderSubflowConfig } from "../../interfaces/orderSubflowConfig";

const OrderSubflowConfigSchema: Schema = new Schema(
  {
    orderFlowType: { type: String, enum: ["TRADE_ORDER"], default: "TRADE_ORDER" },
    subflowType: {
      type: String,
      enum: [
        "PROCUREMENT",
        "LOGISTICS",
        "INLAND_LOGISTICS",
        "PACKAGING",
        "FREIGHT_FORWARDING",
        "INVENTORY",
      ],
      required: true,
      index: true,
    },
    startAtOrderStage: { type: String, required: true },
    mustCompleteBeforeOrderStage: { type: String, required: true },
    biddingStartAtOrderStage: { type: String, default: null },
    biddingEndAtOrderStage: { type: String, default: null },
    dependsOnSubflows: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

OrderSubflowConfigSchema.index({ orderFlowType: 1, subflowType: 1 }, { unique: true });

export const OrderSubflowConfigModel = mongoose.model<IOrderSubflowConfig>(
  "OrderSubflowConfig",
  OrderSubflowConfigSchema
);

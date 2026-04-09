import mongoose, { Schema } from "mongoose";
import { ICommission } from "../../interfaces/commission";

const CommissionSchema: Schema = new Schema(
  {
    dealId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    operatorId: { type: Schema.Types.ObjectId, ref: "Operator", required: true, index: true },
    type: { type: String, enum: ["closer", "portfolio", "leadership", "procurement", "handler"], required: true },
    level: { type: Number, default: null },
    percent: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
CommissionSchema.index({ operatorId: 1, createdAt: -1 });
CommissionSchema.index(
  { dealId: 1, operatorId: 1, type: 1, level: 1 },
  { unique: true, sparse: true }
);

export const CommissionModel = mongoose.model<ICommission>("Commission", CommissionSchema);

import { Types } from "mongoose";
import { VariantRateModel } from "../../database/models/variantRate";
import { ExecutionMode, HookFunction } from "../types";

export const inventoryVariantRateSyncHook: HookFunction = async (payload, mode) => {
  if (mode === ExecutionMode.DELETE) return payload;
  if (!payload || typeof payload !== "object") return payload;

  const linkedRateId = String((payload as any).linkedVariantRate || "");
  if (!Types.ObjectId.isValid(linkedRateId)) return payload;

  const updateDoc: Record<string, any> = {
    quantity: (payload as any).quantity,
    unit: (payload as any).unit,
    state: (payload as any).state || null,
    district: (payload as any).district || null,
    division: (payload as any).division || null,
    pincodeEntry: (payload as any).pincodeEntry || null,
  };

  await VariantRateModel.findByIdAndUpdate(linkedRateId, { $set: updateDoc });
  return payload;
};

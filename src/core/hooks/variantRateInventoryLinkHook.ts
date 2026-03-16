import { Types } from "mongoose";
import { InventoryModel } from "../../database/models/inventory";
import { ExecutionMode, HookFunction } from "../types";

export const variantRateInventoryLinkHook: HookFunction = async (payload, mode) => {
  if (mode === ExecutionMode.DELETE) return payload;
  if (!payload || typeof payload !== "object") return payload;

  const sourceInventoryId = String((payload as any).sourceInventory || "");
  const variantRateId = String((payload as any)._id || "");
  if (!Types.ObjectId.isValid(sourceInventoryId) || !Types.ObjectId.isValid(variantRateId)) {
    return payload;
  }

  await InventoryModel.findByIdAndUpdate(sourceInventoryId, {
    $set: { linkedVariantRate: variantRateId },
  });

  return payload;
};

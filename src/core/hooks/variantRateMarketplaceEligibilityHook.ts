import { VariantRateModel } from "../../database/models/variantRate";
import { assertVariantRateMarketplaceEligible } from "../../services/variantRateMarketplaceEligibilityService";
import { ExecutionMode, HookFunction } from "../types";

export const variantRateMarketplaceEligibilityPreWriteHook: HookFunction = async (payload, mode, id) => {
  const enablingLive = mode === ExecutionMode.UPDATE && id &&
    Object.prototype.hasOwnProperty.call(payload || {}, "isLive") &&
    (payload.isLive === true || String(payload.isLive).toLowerCase() === "true");
  if (!enablingLive) return payload;

  const existing = await VariantRateModel.findById(id).lean();
  await assertVariantRateMarketplaceEligible(existing, { requireLive: false });
  return payload;
};

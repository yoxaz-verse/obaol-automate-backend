import { ExecutionMode, HookFunction } from "../types";

export const variantRateLifecyclePreWriteHook: HookFunction = async (payload, mode) => {
  if (mode !== ExecutionMode.UPDATE || !Object.prototype.hasOwnProperty.call(payload || {}, "isLive")) {
    return payload;
  }

  const now = new Date();
  if (payload.isLive === true || String(payload.isLive).toLowerCase() === "true") {
    return { ...payload, isLive: true, lastLiveAt: now, lastLiveDate: now, unpublishedAt: null };
  }
  return { ...payload, isLive: false, unpublishedAt: now };
};

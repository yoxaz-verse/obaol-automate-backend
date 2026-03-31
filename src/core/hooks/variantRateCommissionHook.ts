import { ExecutionMode, HookFunction } from "../types";

const COMMISSION_RATE = 0.025;
const round2 = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const variantRateCommissionPreWriteHook: HookFunction = async (payload, mode) => {
  if (mode !== ExecutionMode.CREATE && mode !== ExecutionMode.UPDATE) return payload;

  const rateValue = Number((payload as any)?.rate);
  if (!Number.isFinite(rateValue)) return payload;

  (payload as any).commission = round2(rateValue * COMMISSION_RATE);
  return payload;
};

import { SystemConfigModel } from "../database/models/systemConfig";

export type CalculationConfig = {
  variantRateCommissionPercent: number;
  gstPercent: number;
  importAdminCommissionDefault: number;
  warehouseStorageRateDefault: number;
};

export const CALCULATION_CONFIG_KEY = "CALCULATION_CONFIG";

const DEFAULT_CALCULATION_CONFIG: CalculationConfig = {
  variantRateCommissionPercent: 2.5,
  gstPercent: 0,
  importAdminCommissionDefault: 0,
  warehouseStorageRateDefault: 0,
};

const CACHE_TTL_MS = 2 * 60 * 1000;

let cachedConfig: CalculationConfig | null = null;
let cacheExpiresAt = 0;

const toSafeNumber = (value: any, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < 0) return fallback;
  return num;
};

const normalizeConfig = (raw: any): CalculationConfig => {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    variantRateCommissionPercent: toSafeNumber(
      (source as any).variantRateCommissionPercent,
      DEFAULT_CALCULATION_CONFIG.variantRateCommissionPercent
    ),
    gstPercent: toSafeNumber(
      (source as any).gstPercent,
      DEFAULT_CALCULATION_CONFIG.gstPercent
    ),
    importAdminCommissionDefault: toSafeNumber(
      (source as any).importAdminCommissionDefault,
      DEFAULT_CALCULATION_CONFIG.importAdminCommissionDefault
    ),
    warehouseStorageRateDefault: toSafeNumber(
      (source as any).warehouseStorageRateDefault,
      DEFAULT_CALCULATION_CONFIG.warehouseStorageRateDefault
    ),
  };
};

export const getCalculationConfig = async (force = false): Promise<CalculationConfig> => {
  const now = Date.now();
  if (!force && cachedConfig && cacheExpiresAt > now) {
    return cachedConfig;
  }

  const row = await SystemConfigModel.findOne({ key: CALCULATION_CONFIG_KEY }).lean();
  let parsed: any = null;
  try {
    parsed = row?.value ? JSON.parse(String(row.value)) : null;
  } catch {
    parsed = null;
  }

  const normalized = normalizeConfig(parsed);
  cachedConfig = normalized;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return normalized;
};

export const setCalculationConfig = async (
  partial: Partial<CalculationConfig>,
  updatedBy?: string | null
): Promise<CalculationConfig> => {
  const current = await getCalculationConfig(true);
  const merged = normalizeConfig({ ...current, ...partial });

  await SystemConfigModel.findOneAndUpdate(
    { key: CALCULATION_CONFIG_KEY },
    { value: JSON.stringify(merged), updatedBy: updatedBy || null },
    { upsert: true, new: true }
  );

  cachedConfig = merged;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return merged;
};

export const getVariantRateCommissionPercent = async (): Promise<number> => {
  const config = await getCalculationConfig();
  return Number(config.variantRateCommissionPercent || 0);
};

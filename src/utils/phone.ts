export type PhoneNormalizationInput = {
  rawPhone?: any;
  rawCountryCode?: any;
  rawNational?: any;
  fallbackCountryCode?: string;
};

export type PhoneNormalizationResult = {
  e164: string;
  countryCode: string;
  national: string;
};

const DEFAULT_COUNTRY_CODE = "+91";

const toStr = (value: any) => String(value ?? "").trim();

const normalizeCountryCode = (value: any, fallback?: string): string => {
  const raw = toStr(value).replace(/[^\d+]/g, "");
  if (!raw) return fallback || DEFAULT_COUNTRY_CODE;
  if (raw.startsWith("+")) return raw;
  return `+${raw.replace(/\+/g, "")}`;
};

const digitsOnly = (value: any): string => toStr(value).replace(/\D/g, "");

const parseE164 = (value: string): { countryCode: string; national: string } | null => {
  const phone = toStr(value);
  if (!phone.startsWith("+")) return null;
  const compact = `+${phone.slice(1).replace(/\D/g, "")}`;
  if (compact.length < 4) return null;

  // Basic dial-code split heuristic (1-3 digits).
  for (let codeLen = 3; codeLen >= 1; codeLen--) {
    const cc = compact.slice(0, codeLen + 1);
    const national = compact.slice(codeLen + 1);
    if (national.length >= 4) {
      return { countryCode: cc, national };
    }
  }
  return null;
};

export const normalizePhoneInput = (input: PhoneNormalizationInput): PhoneNormalizationResult => {
  const fallbackCountryCode = normalizeCountryCode(input.fallbackCountryCode);
  const rawPhone = toStr(input.rawPhone);
  const rawNational = digitsOnly(input.rawNational);
  const rawCountryCode = normalizeCountryCode(input.rawCountryCode, fallbackCountryCode);

  if (rawNational) {
    return {
      e164: `${rawCountryCode}${rawNational}`,
      countryCode: rawCountryCode,
      national: rawNational,
    };
  }

  const parsed = parseE164(rawPhone);
  if (parsed) {
    return {
      e164: `${parsed.countryCode}${parsed.national}`,
      countryCode: parsed.countryCode,
      national: parsed.national,
    };
  }

  const nationalFromRawPhone = digitsOnly(rawPhone);
  if (!nationalFromRawPhone) {
    return {
      e164: "",
      countryCode: rawCountryCode,
      national: "",
    };
  }

  return {
    e164: `${rawCountryCode}${nationalFromRawPhone}`,
    countryCode: rawCountryCode,
    national: nationalFromRawPhone,
  };
};


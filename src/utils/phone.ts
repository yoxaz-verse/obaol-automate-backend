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

const KNOWN_DIAL_CODES = new Set([
  "1", "7", "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98",
  "212", "213", "216", "218", "234", "254", "255", "256", "260", "263", "351", "352", "353", "354", "355", "356", "357", "358", "359", "380", "420", "421", "880", "886", "960", "961", "962", "963", "964", "965", "966", "967", "968", "970", "971", "974", "975", "976", "977", "992", "993", "994", "995", "996", "998",
]);

const parseE164 = (value: string): { countryCode: string; national: string } | null => {
  const phone = toStr(value);
  if (!phone.startsWith("+")) return null;
  const compact = `+${phone.slice(1).replace(/\D/g, "")}`;
  if (compact.length < 4) return null;

  // Prefer known international dial codes, longest first.
  for (let codeLen = 3; codeLen >= 1; codeLen--) {
    const code = compact.slice(1, codeLen + 1);
    if (!KNOWN_DIAL_CODES.has(code)) continue;
    const cc = `+${code}`;
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

export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const IEC_REGEX = /^[A-Z0-9]{10}$/;
export const CIN_REGEX = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

export const normalizeCompanyIdentifier = (value: unknown) => String(value || "").trim().toUpperCase();

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const hasValidGstinChecksum = (value: unknown) => {
  const gstin = normalizeCompanyIdentifier(value).replace(/\s+/g, "");
  if (!GST_REGEX.test(gstin)) return false;
  let factor = 1;
  let sum = 0;
  for (let index = 0; index < gstin.length - 1; index += 1) {
    const codePoint = GSTIN_CHARS.indexOf(gstin[index]);
    if (codePoint < 0) return false;
    const product = codePoint * factor;
    sum += Math.floor(product / GSTIN_CHARS.length) + (product % GSTIN_CHARS.length);
    factor = factor === 2 ? 1 : 2;
  }
  const checkCodePoint = (GSTIN_CHARS.length - (sum % GSTIN_CHARS.length)) % GSTIN_CHARS.length;
  return GSTIN_CHARS[checkCodePoint] === gstin[gstin.length - 1];
};

import { normalizeCompanyFunctionSlugs } from "./companyCapabilities";

export type BuyerSellerFunctionIds = {
  legacyBuyerId?: string;
  legacySellerId?: string;
  buyerId: string;
  sellerId: string;
  hasSeparateLegacyBuyer?: boolean;
  hasSeparateLegacySeller?: boolean;
};

const uniquePriorityIds = (values: unknown[]) =>
  Array.from(new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean))).slice(0, 3);

export const migrateBuyerSellerProfile = (profile: {
  providedCapabilities?: unknown[];
  soughtCapabilities?: unknown[];
  providedCapabilityPriorities?: unknown[];
  soughtCapabilityPriorities?: unknown[];
}, ids: BuyerSellerFunctionIds) => {
  const rawProvided = Array.isArray(profile.providedCapabilities) ? profile.providedCapabilities.map(String) : [];
  const rawSought = Array.isArray(profile.soughtCapabilities) ? profile.soughtCapabilities.map(String) : [];
  const hasLegacySoughtBuying = rawSought.some((value) => /^(buy|buying)$/i.test(value));
  const hasLegacySoughtSelling = rawSought.some((value) => /^(sell|selling)$/i.test(value));

  const mapProvidedPriority = (value: unknown) => {
    const id = String(value);
    if (ids.legacyBuyerId && id === ids.legacyBuyerId) return ids.buyerId;
    if (ids.legacySellerId && id === ids.legacySellerId) return ids.sellerId;
    return id;
  };
  const mapSoughtPriority = (value: unknown) => {
    const id = String(value);
    if (ids.legacyBuyerId && id === ids.legacyBuyerId && (hasLegacySoughtBuying || ids.hasSeparateLegacyBuyer)) return ids.sellerId;
    if (ids.legacySellerId && id === ids.legacySellerId && (hasLegacySoughtSelling || ids.hasSeparateLegacySeller)) return ids.buyerId;
    return id;
  };

  return {
    providedCapabilities: normalizeCompanyFunctionSlugs(rawProvided, "provided"),
    soughtCapabilities: normalizeCompanyFunctionSlugs(rawSought, "sought"),
    providedCapabilityPriorities: uniquePriorityIds((profile.providedCapabilityPriorities || []).map(mapProvidedPriority)),
    soughtCapabilityPriorities: uniquePriorityIds((profile.soughtCapabilityPriorities || []).map(mapSoughtPriority)),
  };
};

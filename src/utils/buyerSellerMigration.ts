import { normalizeCompanyFunctionSlugs } from "./companyCapabilities";

export type BuyerSellerFunctionIds = {
  legacyBuyerId?: string;
  legacySellerId?: string;
  legacyBuyerIds?: string[];
  legacySellerIds?: string[];
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
  const legacyBuyerIds = new Set([ids.legacyBuyerId, ...(ids.legacyBuyerIds || [])].map(String).filter(Boolean));
  const legacySellerIds = new Set([ids.legacySellerId, ...(ids.legacySellerIds || [])].map(String).filter(Boolean));

  const mapProvidedPriority = (value: unknown) => {
    const id = String(value);
    if (legacyBuyerIds.has(id)) return ids.buyerId;
    if (legacySellerIds.has(id)) return ids.sellerId;
    return id;
  };
  const mapSoughtPriority = (value: unknown) => {
    const id = String(value);
    if (legacyBuyerIds.has(id) && (hasLegacySoughtBuying || ids.hasSeparateLegacyBuyer)) return ids.sellerId;
    if (legacySellerIds.has(id) && (hasLegacySoughtSelling || ids.hasSeparateLegacySeller)) return ids.buyerId;
    return id;
  };

  return {
    providedCapabilities: normalizeCompanyFunctionSlugs(rawProvided, "provided"),
    soughtCapabilities: normalizeCompanyFunctionSlugs(rawSought, "sought"),
    providedCapabilityPriorities: uniquePriorityIds((profile.providedCapabilityPriorities || []).map(mapProvidedPriority)),
    soughtCapabilityPriorities: uniquePriorityIds((profile.soughtCapabilityPriorities || []).map(mapSoughtPriority)),
  };
};

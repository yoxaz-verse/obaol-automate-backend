const ALIAS_TO_CANONICAL: Record<string, string> = {
  QUALITY_TESTING_PARTNER: "QUALITY_TESTING",
  TESTING: "QUALITY_TESTING",
  PACKAGING_PARTNER: "PACKAGING",
  PACKAGING: "PACKAGING",
  PROCUREMENT_PARTNER: "PROCUREMENT",
  SOURCING: "PROCUREMENT",
  LOGISTICS_PARTNER: "TRANSPORTATION",
  LOGISTICS_SERVICE: "TRANSPORTATION",
  SHIPPING_PARTNER: "TRANSPORTATION",
  TRANSPORT_PARTNER: "TRANSPORTATION",
  INLAND_TRANSPORTATION: "TRANSPORTATION",
  INLAND_TRANSPORT: "TRANSPORTATION",
  INLAND_LOGISTICS: "TRANSPORTATION",
  SHIPPING: "TRANSPORTATION",
  OCEAN_FREIGHT: "TRANSPORTATION",
  AIR_FREIGHT: "TRANSPORTATION",
  SEA_FREIGHT_FORWARDING: "TRANSPORTATION",
  AIR_FREIGHT_FORWARDING: "TRANSPORTATION",
  FREIGHT_FORWARDING: "TRANSPORTATION",
  WAREHOUSING: "WAREHOUSING",
  WAREHOUSE_STORAGE: "WAREHOUSING",
  CONSOLIDATION_LCL: "TRANSPORTATION",
  PROJECT_CARGO: "TRANSPORTATION",
  CUSTOMS: "CUSTOMS_CLEARANCE",
};

const REQUEST_TYPE_ALIAS_MAP: Record<string, string[]> = {
  PROCUREMENT: ["PROCUREMENT"],
  QUALITY_TESTING: ["QUALITY_TESTING", "CERTIFICATION"],
  PACKAGING: ["PACKAGING"],
  TRANSPORTATION: ["TRANSPORTATION"],
  CUSTOMS_CLEARANCE: ["CUSTOMS_CLEARANCE"],
  WAREHOUSING: ["WAREHOUSING"],
};

const normalizeToken = (value: unknown): string =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

export const normalizeCapability = (value: unknown): string => {
  const token = normalizeToken(value);
  if (!token) return "";
  return ALIAS_TO_CANONICAL[token] || token;
};

export const normalizeCapabilities = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => normalizeCapability(value))
        .filter(Boolean)
    )
  );
};

export const requestTypeToCapabilityAliases = (requestType: unknown): string[] => {
  const key = normalizeToken(requestType);
  const aliases = REQUEST_TYPE_ALIAS_MAP[key] || [];
  return Array.from(new Set(aliases.map((value) => normalizeCapability(value)).filter(Boolean)));
};

export const matchesRequestTypeByCapabilities = (requestType: unknown, capabilities: unknown): boolean => {
  const accepted = new Set(requestTypeToCapabilityAliases(requestType));
  if (!accepted.size) return false;
  return normalizeCapabilities(capabilities).some((capability) => accepted.has(capability));
};

export const supportedRequestTypesForCapabilities = (capabilities: unknown): string[] => {
  const normalized = normalizeCapabilities(capabilities);
  if (!normalized.length) return [];
  return Object.keys(REQUEST_TYPE_ALIAS_MAP).filter((requestType) =>
    matchesRequestTypeByCapabilities(requestType, normalized)
  );
};

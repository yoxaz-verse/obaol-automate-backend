export const COMPANY_INTERESTS = [
  "PROCUREMENT",
  "CERTIFICATION",
  "TRANSPORTATION",
  "SHIPPING",
  "PACKAGING",
  "QUALITY_TESTING",
  "OCEAN_FREIGHT",
  "AIR_FREIGHT",
  "INLAND_LOGISTICS",
  "SEA_FREIGHT_FORWARDING",
  "AIR_FREIGHT_FORWARDING",
  "CUSTOMS_CLEARANCE",
  "INLAND_TRANSPORT",
  "WAREHOUSING",
  "CONSOLIDATION_LCL",
  "PROJECT_CARGO",
] as const;

export type CompanyInterest = (typeof COMPANY_INTERESTS)[number];

export const ASSOCIATE_INTERESTS = [
  "BUYER",
  "SUPPLIER",
  "LOGISTICS_PARTNER",
  "PROCUREMENT_PARTNER",
  "PACKAGING_PARTNER",
  "MANUFACTURING_PARTNER",
  "QUALITY_TESTING_PARTNER",
  "CERTIFICATION_PARTNER",
  "OCEAN_FREIGHT",
  "AIR_FREIGHT",
  "INLAND_LOGISTICS",
  "SEA_FREIGHT_FORWARDING",
  "AIR_FREIGHT_FORWARDING",
  "CUSTOMS_CLEARANCE",
  "INLAND_TRANSPORT",
  "WAREHOUSING",
  "CONSOLIDATION_LCL",
  "PROJECT_CARGO",
] as const;

export type AssociateInterest = (typeof ASSOCIATE_INTERESTS)[number];

export const normalizeCompanyInterests = (values: any): CompanyInterest[] => {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(COMPANY_INTERESTS);
  const normalized = values
    .map((value) => String(value || "").trim().toUpperCase())
    .filter((value) => allowed.has(value as CompanyInterest));
  return Array.from(new Set(normalized)) as CompanyInterest[];
};

export const normalizeAssociateInterests = (values: any): AssociateInterest[] => {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(ASSOCIATE_INTERESTS);
  const normalized = values
    .map((value) => String(value || "").trim().toUpperCase())
    .filter((value) => allowed.has(value as AssociateInterest));
  return Array.from(new Set(normalized)) as AssociateInterest[];
};

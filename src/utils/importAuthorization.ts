import { normalizeCompanyFunctionSlugs } from "./companyCapabilities";

export const IMPORTER_COMPANY_CAPABILITY = "importing-to-india";

export const hasImporterCompanyCapability = (capabilities: unknown): boolean =>
  normalizeCompanyFunctionSlugs(capabilities).includes(IMPORTER_COMPANY_CAPABILITY);

export const canCompanyCreateImportListing = (
  capabilities: unknown,
  hasImporterFunctionMapping: boolean
): boolean => hasImporterCompanyCapability(capabilities) || hasImporterFunctionMapping;

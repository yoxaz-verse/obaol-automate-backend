import { describe, expect, it } from "vitest";
import {
  CANONICAL_COMPANY_FUNCTION_SLUGS,
  normalizeCompanyFunctionSlug,
  normalizeCompanyFunctionSlugs,
} from "./companyCapabilities";

describe("company capability normalization", () => {
  it("keeps the eleven onboarding categories canonical", () => {
    expect(CANONICAL_COMPANY_FUNCTION_SLUGS).toHaveLength(11);
    expect(normalizeCompanyFunctionSlugs(CANONICAL_COMPANY_FUNCTION_SLUGS)).toEqual(CANONICAL_COMPANY_FUNCTION_SLUGS);
  });

  it("maps legacy granular interests into onboarding categories", () => {
    expect(normalizeCompanyFunctionSlug("BUY")).toBe("buyer");
    expect(normalizeCompanyFunctionSlug("SELLING")).toBe("seller");
    expect(normalizeCompanyFunctionSlug("BUYING", "sought")).toBe("seller");
    expect(normalizeCompanyFunctionSlug("SELLING", "sought")).toBe("buyer");
    expect(normalizeCompanyFunctionSlug("PROCUREMENT")).toBe("sourcing");
    expect(normalizeCompanyFunctionSlug("QUALITY_TESTING")).toBe("testing");
    expect(normalizeCompanyFunctionSlug("WAREHOUSING")).toBe("warehouse-storage");
    expect(normalizeCompanyFunctionSlug("OCEAN_FREIGHT")).toBe("freight-forwarding");
    expect(normalizeCompanyFunctionSlug("INLAND_TRANSPORTATION")).toBe("inland-logistics");
    expect(normalizeCompanyFunctionSlug("IMPORTING_DISTRIBUTION")).toBe("importing-to-india");
    expect(normalizeCompanyFunctionSlug("EXPORTING_FROM_INDIA")).toBe("exporting-from-india");
  });

  it("deduplicates legacy values that resolve to the same category", () => {
    expect(normalizeCompanyFunctionSlugs(["SHIPPING", "AIR_FREIGHT", "freight-forwarding"])).toEqual(["freight-forwarding"]);
  });
});

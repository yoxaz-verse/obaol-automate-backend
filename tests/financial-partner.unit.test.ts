import { describe, expect, it } from "vitest";
import { validateFinancialProfile } from "../src/controllers/financialPartnerController";

const validProfile = () => ({
  displayName: "Verified Trade Bank", contactEmail: "finance@example.com", contactPhone: "+911234567890",
  partnerTypes: ["BANK"], locations: [{ label: "Head office", country: "India" }],
  offerings: [{ title: "Export working capital", type: "EXPORT_FINANCE", currencies: ["INR"], minimumAmount: 100000, maximumAmount: 5000000 }],
});

describe("financial partner profile validation", () => {
  it("accepts a complete portfolio", () => expect(validateFinancialProfile(validProfile())).toEqual([]));
  it("requires identity, partner type, location, and offering", () => expect(validateFinancialProfile({}).length).toBeGreaterThanOrEqual(6));
  it("rejects an inverted amount range", () => {
    const profile = validProfile(); profile.offerings[0].maximumAmount = 10;
    expect(validateFinancialProfile(profile)).toContain("Offering 1 maximum amount must be at least its minimum");
  });
});

import { describe, expect, it } from "vitest";
import { validateInsuranceProfile } from "../src/controllers/insurancePartnerController";

const validProfile = () => ({
  displayName: "Trusted Cargo Insurer",
  contactEmail: "insurance@example.com",
  contactPhone: "+911234567890",
  partnerTypes: ["INSURER"],
  regulator: "IRDAI",
  licenceNumber: "IRDAI-123",
  locations: [{ label: "Head office", country: "India" }],
  products: [{
    title: "Marine cargo cover",
    type: "CARGO_MARINE",
    currencies: ["INR"],
    clauses: ["All risks, subject to stated conditions"],
    exclusions: ["Products that are not authentic"],
    minimumInsuredValue: 1000,
    maximumInsuredValue: 100000,
  }],
});

describe("insurance partner profile validation", () => {
  it("accepts complete multiword clauses and exclusions", () => {
    expect(validateInsuranceProfile(validProfile())).toEqual([]);
  });

  it("requires identity, regulatory details, location, and products", () => {
    expect(validateInsuranceProfile({}).length).toBeGreaterThanOrEqual(6);
  });

  it("rejects an inverted insured-value range", () => {
    const profile = validProfile();
    profile.products[0].maximumInsuredValue = 10;
    expect(validateInsuranceProfile(profile)).toContain("Product 1 maximum insured value must be at least its minimum");
  });
});

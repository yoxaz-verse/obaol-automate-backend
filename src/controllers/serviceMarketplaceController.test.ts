import { describe, expect, it } from "vitest";
import { validatePackagingRequirementInput, validateServiceProfile } from "./serviceMarketplaceController";

const valid = { title: "Export rice bags", commodityId: "507f1f77bcf86cd799439011", quantity: 10, attachmentUrls: [] };

describe("packaging requirement validation", () => {
  it("accepts legacy-compatible requirements", () => expect(validatePackagingRequirementInput(valid)).toEqual([]));
  it("validates production specification quantities", () => {
    const errors = validatePackagingRequirementInput({ ...valid, packageCapacity: 0, packageCount: 1.5 });
    expect(errors).toEqual(expect.arrayContaining(["Package capacity must be greater than zero", "Package count must be a positive whole number"]));
  });
  it("checks package count against a compatible total quantity", () => {
    expect(validatePackagingRequirementInput({ ...valid, quantity: 1, unit: "MT", packageCapacity: 25, packageCapacityUnit: "KG", packageCount: 20 })).toContain("Package capacity multiplied by package count must match the total quantity");
    expect(validatePackagingRequirementInput({ ...valid, quantity: 1, unit: "MT", packageCapacity: 25, packageCapacityUnit: "KG", packageCount: 40 })).toEqual([]);
  });
  it("rejects unsafe attachment schemes", () => {
    expect(validatePackagingRequirementInput({ ...valid, attachmentUrls: ["javascript:alert(1)"] })).toContain("Attachments must be valid HTTP or HTTPS URLs");
  });
});

describe("packaging unit validation", () => {
  const capability = { name: "Bulk and custom packing", serviceIds: ["1"], formatIds: ["2"], materialIds: ["3"], commodityIds: ["4"] };
  it("accepts a physical unit with multiple structured capabilities", () => {
    expect(validateServiceProfile({ displayName: "Kochi Unit", contactEmail: "unit@example.com", contactPhone: "123", locations: [{ name: "Kochi" }], capabilities: [capability, { ...capability, name: "Retail pouches" }] })).toEqual([]);
  });
  it("requires every capability to describe service, format, material, and commodity", () => {
    expect(validateServiceProfile({ displayName: "Kochi Unit", contactEmail: "unit@example.com", contactPhone: "123", locations: [{}], capabilities: [{ ...capability, serviceIds: [] }] })).toContain("Capability 1 requires services, formats, materials, and commodities");
  });
});

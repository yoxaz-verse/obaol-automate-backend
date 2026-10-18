import { describe, expect, it } from "vitest";
import { redactServiceRequirement, resolveServiceRequirementStatus } from "../src/services/serviceMarketplaceService";
import { validateServiceProfile } from "../src/controllers/serviceMarketplaceController";

describe("packaging service marketplace", () => {
  const now = new Date("2026-10-19T10:00:00.000Z");
  it("evaluates its UTC lifecycle deterministically", () => {
    expect(resolveServiceRequirementStatus("SCHEDULED", "2026-10-19T11:00:00Z", "2026-10-19T12:00:00Z", now)).toBe("SCHEDULED");
    expect(resolveServiceRequirementStatus("SCHEDULED", "2026-10-19T09:00:00Z", "2026-10-19T12:00:00Z", now)).toBe("OPEN");
    expect(resolveServiceRequirementStatus("OPEN", "2026-10-19T09:00:00Z", "2026-10-19T10:00:00Z", now)).toBe("CLOSED");
    expect(resolveServiceRequirementStatus("AWARDED", null, null, now)).toBe("AWARDED");
  });
  it("does not serialize sealed commercial details for an open requirement owner", () => {
    const response = redactServiceRequirement({ _id: "r1", status: "OPEN", requesterCompany: "buyer" }, [{ _id: "o1", providerCompany: { _id: "seller", name: "Secret Seller" }, price: 125, note: "private", status: "SUBMITTED" }], { companyId: "buyer", owner: true });
    expect(response.offerCount).toBe(1); expect(response.offers).toBeUndefined(); expect(JSON.stringify(response)).not.toContain("125"); expect(JSON.stringify(response)).not.toContain("Secret Seller");
  });
  it("reveals complete offers to the owner only after closing", () => {
    const offers = [{ _id: "o1", providerCompany: { _id: "seller", name: "Seller" }, price: 125, status: "SUBMITTED" }];
    expect(redactServiceRequirement({ status: "CLOSED" }, offers, { owner: true }).offers).toEqual(offers);
    expect(redactServiceRequirement({ status: "CLOSED" }, offers, { provider: true, companyId: "other" }).offers).toBeUndefined();
  });
  it("requires a structured provider profile", () => {
    expect(validateServiceProfile({ displayName: "Pack Co" })).toContain("At least one packaging capability is required");
    expect(validateServiceProfile({ displayName: "Pack Co", contactEmail: "a@b.com", contactPhone: "1", locations: [{}], capabilities: [{ name: "Pouches", serviceIds: ["1"], formatIds: ["2"], materialIds: ["3"], commodityIds: ["4"] }] })).toEqual([]);
  });
});

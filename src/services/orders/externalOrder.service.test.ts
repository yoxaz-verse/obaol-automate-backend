import { describe, expect, it } from "vitest";
import { prepareExternalOrder } from "./externalOrder.service";

const base = {
  externalBuyer: { name: "Buyer Ltd", email: "buyer@example.com" },
  externalSeller: { name: "Seller Ltd" },
  externalProduct: { name: "Pepper", quantity: 2, unit: "MT" },
  externalTradeType: "DOMESTIC",
  externalRole: "BUYER",
  packagingSpecifications: "Food-grade bags",
  executionContext: {
    tradeType: "DOMESTIC",
    originState: "Kerala",
    originDistrict: "Kochi",
    destinationState: "Delhi",
    destinationDistrict: "Delhi",
  },
  responsibilities: {
    procurementBy: "seller",
    qualityTestingBy: "obaol",
    packagingBy: "seller",
    transportBy: "buyer",
  },
};

describe("external order preparation", () => {
  it("normalizes a complete domestic order without changing its API fields", () => {
    const result = prepareExternalOrder(base, "actor-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toMatchObject({
      enquiry: null,
      isExternal: true,
      externalCreatedBy: "actor-1",
      externalTradeType: "DOMESTIC",
      status: "Procuring",
    });
    expect(result.payload).not.toHaveProperty("workflowStage");
    expect(result.payload.responsibilities.transportBy).toBe("buyer");
  });

  it("requires international ports and international responsibilities", () => {
    const missingPorts = prepareExternalOrder({ ...base, externalTradeType: "INTERNATIONAL", executionContext: { tradeType: "INTERNATIONAL" } }, "actor-1");
    expect(missingPorts).toEqual({ ok: false, message: "International execution context requires origin/destination country and port." });

    const missingShipping = prepareExternalOrder({
      ...base,
      externalTradeType: "INTERNATIONAL",
      executionContext: { tradeType: "INTERNATIONAL", originCountry: "IN", originPort: "INNSA", destinationCountry: "AE", destinationPort: "AEJEA" },
    }, "actor-1");
    expect(missingShipping).toEqual({ ok: false, message: "Responsibilities are incomplete or invalid." });
  });

  it("rejects restricted responsibility ownership", () => {
    const result = prepareExternalOrder({
      ...base,
      responsibilities: { ...base.responsibilities, dutiesTaxesBy: "seller" },
    }, "actor-1");
    expect(result).toEqual({ ok: false, message: "Invalid responsibility selection." });
  });

  it("does not allow undisclosed parties", () => {
    const result = prepareExternalOrder({ ...base, externalBuyer: { name: "Undisclosed" } }, "actor-1");
    expect(result).toEqual({ ok: false, message: "Buyer and seller must be disclosed to create an external order." });
  });
});

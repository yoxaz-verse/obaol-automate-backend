import { describe, expect, it } from "vitest";
import { matchesSellerBiddingView, resolveProductBiddingStatus } from "../src/services/productBiddingService";

describe("product bidding lifecycle", () => {
  const now = new Date("2026-10-18T10:00:00.000Z");
  it("keeps future events scheduled", () => expect(resolveProductBiddingStatus("SCHEDULED", "2026-10-18T11:00:00Z", "2026-10-18T12:00:00Z", now)).toBe("SCHEDULED"));
  it("opens events inside their window", () => expect(resolveProductBiddingStatus("SCHEDULED", "2026-10-18T09:00:00Z", "2026-10-18T12:00:00Z", now)).toBe("OPEN"));
  it("closes events at the exact deadline", () => expect(resolveProductBiddingStatus("OPEN", "2026-10-18T09:00:00Z", "2026-10-18T10:00:00Z", now)).toBe("CLOSED"));
  it("preserves terminal states", () => {
    expect(resolveProductBiddingStatus("AWARDED", null, null, now)).toBe("AWARDED");
    expect(resolveProductBiddingStatus("CANCELLED", null, null, now)).toBe("CANCELLED");
  });
});

describe("seller bidding views", () => {
  const companyId = "seller-1";
  const eligible = new Set(["product:product-1"]);
  const event = (status: string) => ({ status, product: "product-1" });
  const offer = (status: string) => [{ sellerCompany: companyId, status }];

  it("keeps eligible open events available until an active offer is submitted", () => {
    expect(matchesSellerBiddingView(event("OPEN"), [], companyId, "available", eligible)).toBe(true);
    expect(matchesSellerBiddingView(event("OPEN"), offer("WITHDRAWN"), companyId, "available", eligible)).toBe(true);
    expect(matchesSellerBiddingView(event("OPEN"), offer("SUBMITTED"), companyId, "available", eligible)).toBe(false);
  });
  it("classifies active participation and terminal history", () => {
    expect(matchesSellerBiddingView(event("CLOSED"), offer("SUBMITTED"), companyId, "participating")).toBe(true);
    expect(matchesSellerBiddingView(event("AWARDED"), offer("NOT_SELECTED"), companyId, "history")).toBe(true);
    expect(matchesSellerBiddingView(event("OPEN"), offer("SUBMITTED"), companyId, "history")).toBe(false);
  });
});

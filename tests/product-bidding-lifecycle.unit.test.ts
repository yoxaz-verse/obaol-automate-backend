import { describe, expect, it } from "vitest";
import { resolveProductBiddingStatus } from "../src/services/productBiddingService";

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

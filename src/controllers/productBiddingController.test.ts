import { describe, expect, it } from "vitest";
import { validateProductBiddingSchedule } from "./productBiddingController";

describe("product bidding schedule validation", () => {
  const open = "2099-10-20T10:00:00.000Z";
  const close = "2099-10-20T12:00:00.000Z";
  const delivery = "2099-10-21T00:00:00.000Z";

  it("accepts an ordered opening, closing, and delivery timeline", () => {
    expect(validateProductBiddingSchedule(open, close, delivery)).toBeNull();
  });

  it("rejects a closing time that is not after opening", () => {
    expect(validateProductBiddingSchedule(open, open, delivery)).toBe("Closing time must be after opening time.");
  });

  it("requires a delivery date", () => {
    expect(validateProductBiddingSchedule(open, close, null)).toBe("A valid delivery date is required.");
  });

  it("rejects delivery that is not after closing", () => {
    expect(validateProductBiddingSchedule(open, close, close)).toBe("Delivery date must be after the closing date.");
  });
});

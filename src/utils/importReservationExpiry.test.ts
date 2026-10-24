import { describe, expect, it } from "vitest";
import { IMPORT_RESERVATION_REVIEW_WINDOW_MS, isPendingImportReservationExpired } from "./importReservationExpiry";

describe("import reservation expiry", () => {
  const now = new Date("2026-10-23T12:00:00.000Z");

  it("keeps pending reservations active before 15 full days", () => {
    const updatedAt = new Date(now.getTime() - IMPORT_RESERVATION_REVIEW_WINDOW_MS + 1);
    expect(isPendingImportReservationExpired({ status: "PENDING", updatedAt }, now)).toBe(false);
  });

  it("expires pending reservations at the 15-day boundary", () => {
    const updatedAt = new Date(now.getTime() - IMPORT_RESERVATION_REVIEW_WINDOW_MS);
    expect(isPendingImportReservationExpired({ status: "PENDING", updatedAt }, now)).toBe(true);
  });

  it.each(["APPROVED", "REJECTED", "CANCELLED", "LOCKED", "ACCEPTED", "EXPIRED"])(
    "does not expire %s reservations",
    (status) => {
      const updatedAt = new Date(now.getTime() - IMPORT_RESERVATION_REVIEW_WINDOW_MS - 1);
      expect(isPendingImportReservationExpired({ status, updatedAt }, now)).toBe(false);
    }
  );

  it("uses the latest update time so an edit restarts the review window", () => {
    const recentlyEditedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(isPendingImportReservationExpired({ status: "PENDING", updatedAt: recentlyEditedAt }, now)).toBe(false);
  });
});

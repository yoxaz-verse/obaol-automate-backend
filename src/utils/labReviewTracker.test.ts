import { describe, expect, it } from "vitest";
import { addBusinessDays, businessDaysElapsed, deriveLabStatusHistory, normalizeLabReviewBusinessDays, withLabReviewMetadata } from "./labReviewTracker";

describe("lab review tracker", () => {
  it("adds review business days across weekends", () => {
    expect(addBusinessDays("2026-11-06T10:00:00.000Z", 5).toISOString()).toBe("2026-11-13T10:00:00.000Z");
    expect(businessDaysElapsed("2026-11-06T10:00:00.000Z", new Date("2026-11-09T12:00:00.000Z"))).toBe(1);
  });

  it("uses a safe default for invalid configuration", () => {
    expect(normalizeLabReviewBusinessDays(0)).toBe(5);
    expect(normalizeLabReviewBusinessDays(10)).toBe(10);
  });

  it("derives milestones for legacy profiles without stored history", () => {
    const history = deriveLabStatusHistory({ status: "REJECTED", createdAt: "2026-11-01T00:00:00Z", submittedAt: "2026-11-02T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z", reviewNotes: "Add evidence" });
    expect(history.map((event) => event.status)).toEqual(["DRAFT", "PENDING_REVIEW", "REJECTED"]);
    expect(history.at(-1)?.note).toBe("Add evidence");
  });

  it("marks only pending profiles overdue", () => {
    const pending = withLabReviewMetadata({ status: "PENDING_REVIEW", submittedAt: "2026-11-02T00:00:00Z" }, 5, new Date("2026-11-11T00:00:01Z"));
    const published = withLabReviewMetadata({ status: "PUBLISHED", submittedAt: "2026-11-02T00:00:00Z" }, 5, new Date("2026-11-11T00:00:01Z"));
    expect(pending.isReviewOverdue).toBe(true);
    expect(published.isReviewOverdue).toBe(false);
  });
});

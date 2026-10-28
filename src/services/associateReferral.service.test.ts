import { describe, expect, it } from "vitest";
import { indiaMonthWindow } from "./associateReferral.service";

describe("indiaMonthWindow", () => {
  it("uses India calendar boundaries across a UTC day boundary", () => {
    const window = indiaMonthWindow(new Date("2025-12-31T18:30:00.000Z"));
    expect(window.start.toISOString()).toBe("2025-12-31T18:30:00.000Z");
    expect(window.end.toISOString()).toBe("2026-01-31T18:30:00.000Z");
  });

  it("handles December to January rollover", () => {
    const window = indiaMonthWindow(new Date("2026-12-31T18:29:59.999Z"));
    expect(window.start.toISOString()).toBe("2026-11-30T18:30:00.000Z");
    expect(window.end.toISOString()).toBe("2026-12-31T18:30:00.000Z");
  });
});
